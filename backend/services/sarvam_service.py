import asyncio
import io
import json
import logging
import mimetypes
import re
from typing import Any, Dict, Optional

from sarvamai import AsyncSarvamAI

from agents.prompts import SYSTEM_PROMPT
from config import BILL_EXTRACT_SCHEMA, SARVAM_API_KEY
from models.schemas import AgentDecision

logger = logging.getLogger(__name__)

_client: Optional[AsyncSarvamAI] = None

TERMINAL_JOB_STATUSES = {"completed", "partially_completed", "failed", "rejected"}


def get_client() -> AsyncSarvamAI:
    global _client
    if _client is None:
        _client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)
    return _client


def get_demo_bill_data() -> Dict[str, Any]:
    return {
        "items": [
            {"name": "Masala Chai", "qty": 4, "total_price": 80.0},
            {"name": "Cheese Maggi", "qty": 2, "total_price": 140.0},
            {"name": "Paneer Paratha", "qty": 3, "total_price": 210.0},
            {"name": "Cold Coffee", "qty": 2, "total_price": 160.0},
        ],
        "tax_and_fees": 29.5,
        "grand_total": 619.5,
    }


async def _poll_extract_results(job_id: str) -> Dict[str, Any]:
    client = get_client()
    status_value = "queued"
    for _ in range(45):
        status_resp = await client.doc_ai.get_status(job_id)
        status_value = status_resp.status
        if status_value in TERMINAL_JOB_STATUSES:
            break
        await asyncio.sleep(2)
    if status_value not in {"completed", "partially_completed"}:
        raise RuntimeError(f"Document extract job ended with status: {status_value}")
    results = await client.doc_ai.get_results(job_id, format="json")
    if hasattr(results, "result"):
        return dict(results.result)
    raise RuntimeError("Extract results missing result payload")


async def extract_bill_ocr(file_bytes: bytes, filename: str) -> dict:
    try:
        client = get_client()
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        file_tuple = (filename, io.BytesIO(file_bytes), content_type)
        job = await client.doc_ai.extract(
            file=[file_tuple],
            schema=BILL_EXTRACT_SCHEMA,
            output_format="json",
        )
        return await _poll_extract_results(job.job_id)
    except Exception as exc:
        logger.exception("OCR extract failed, using demo bill: %s", exc)
        return get_demo_bill_data()


async def transcribe_voice(audio_bytes: bytes, filename: str = "voice.wav") -> dict:
    try:
        client = get_client()
        content_type = mimetypes.guess_type(filename)[0] or "audio/wav"
        file_tuple = (filename, io.BytesIO(audio_bytes), content_type)
        try:
            response = await client.speech_to_text.transcribe(
                file=file_tuple,
                model="saaras:v4",
                mode="transcribe",
                keyterms=[
                    "hisab",
                    "barabar",
                    "khate",
                    "split",
                    "baant",
                    "maggi",
                    "chai",
                    "paratha",
                ],
            )
        except Exception:
            response = await client.speech_to_text.transcribe(
                file=file_tuple,
                model="saaras:v3",
                mode="transcribe",
                keyterms=[
                    "hisab",
                    "barabar",
                    "khate",
                    "split",
                    "baant",
                    "maggi",
                    "chai",
                    "paratha",
                ],
            )
        return {
            "transcript": response.transcript or "",
            "language_code": response.language_code or "hi-IN",
        }
    except Exception as exc:
        logger.exception("STT failed: %s", exc)
        return {
            "transcript": "",
            "language_code": "hi-IN",
        }


def _fallback_decision() -> AgentDecision:
    return AgentDecision(
        action="clarify",
        spoken_reply="माफ़ कीजिये, मुझे आपकी बात समझ नहीं आई, कृपया दोबारा बोलें।",
        target_language_code="hi-IN",
    )


async def run_agent_llm(system_prompt: str, user_prompt: str) -> AgentDecision:
    try:
        client = get_client()
        models_to_try = ["sarvam-105b-conversations", "sarvam-105b"]
        raw_output = ""
        for model_name in models_to_try:
            try:
                response = await client.chat.completions(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=512,
                )
                raw_output = response.choices[0].message.content or ""
                if raw_output.strip():
                    break
            except Exception as model_exc:
                logger.warning("Chat model %s failed: %s", model_name, model_exc)
        if not raw_output.strip():
            return _fallback_decision()
        match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if not match:
            return _fallback_decision()
        payload = json.loads(match.group(0))
        return AgentDecision.model_validate(payload)
    except Exception as exc:
        logger.exception("Agent LLM parse failed: %s", exc)
        return _fallback_decision()


async def synthesize_voice(text: str, lang_code: str = "hi-IN") -> Optional[str]:
    if not text.strip():
        return None
    try:
        client = get_client()
        models_to_try = ["bulbul:v4-flash", "bulbul:v3"]
        for model_name in models_to_try:
            try:
                response = await client.text_to_speech.convert(
                    text=text,
                    language_code=lang_code,
                    model=model_name,
                    output_audio_codec="mp3",
                    pace=1.05,
                )
                if response.audios:
                    return response.audios[0]
            except Exception as model_exc:
                logger.warning("TTS model %s failed: %s", model_name, model_exc)
        return None
    except Exception as exc:
        logger.exception("TTS failed: %s", exc)
        return None


async def run_split_agent_llm(bill_state_json: str, voice_command: str) -> AgentDecision:
    from agents.prompts import build_user_prompt

    return await run_agent_llm(
        SYSTEM_PROMPT,
        build_user_prompt(bill_state_json, voice_command),
    )
