import logging
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from agents.split_agent import process_voice_command
from agents.tools import recalculate_splits
from models.schemas import BillItem, BillState, TextCommandRequest, VoiceCommandResponse
from services.sarvam_service import (
    extract_bill_ocr,
    get_demo_bill_data,
    synthesize_voice,
    transcribe_voice,
)
from state.session_store import get_session, save_session, session_exists

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Hisab-Kitab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 1) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def bill_state_from_ocr_data(session_id: str, data: Dict[str, Any]) -> BillState:
    items: list[BillItem] = []
    for index, raw in enumerate(data.get("items") or [], start=1):
        if not isinstance(raw, dict):
            continue
        items.append(
            BillItem(
                item_id=f"item_{index}",
                name=str(raw.get("name") or f"Item {index}"),
                qty=_safe_int(raw.get("qty"), 1),
                total_price=_safe_float(raw.get("total_price"), 0.0),
            )
        )
    tax_and_fees = _safe_float(data.get("tax_and_fees"), 0.0)
    grand_total = _safe_float(data.get("grand_total"), 0.0)
    items_subtotal = sum(item.total_price for item in items)
    if items_subtotal > 0 and grand_total > 0 and items_subtotal < grand_total * 0.05:
        target_subtotal = grand_total - tax_and_fees if tax_and_fees > 0 else grand_total
        scale = target_subtotal / items_subtotal
        for item in items:
            item.total_price = round(item.total_price * scale, 2)
    state = BillState(
        session_id=session_id,
        items=items,
        tax_and_fees=tax_and_fees,
        grand_total=grand_total if grand_total > 0 else items_subtotal + tax_and_fees,
    )
    return recalculate_splits(state)


def require_session(session_id: str) -> BillState:
    state = get_session(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/bill/upload", response_model=BillState)
async def upload_bill(file: UploadFile) -> BillState:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    filename = file.filename or "receipt.jpg"
    ocr_data = await extract_bill_ocr(file_bytes, filename)
    session_id = str(uuid.uuid4())
    state = bill_state_from_ocr_data(session_id, ocr_data)
    return save_session(state)


@app.post("/api/bill/demo", response_model=BillState)
async def load_demo_bill() -> BillState:
    session_id = str(uuid.uuid4())
    state = bill_state_from_ocr_data(session_id, get_demo_bill_data())
    return save_session(state)


@app.get("/api/bill/{session_id}", response_model=BillState)
async def get_bill(session_id: str) -> BillState:
    return require_session(session_id)


@app.post("/api/bill/{session_id}/voice", response_model=VoiceCommandResponse)
async def voice_command(session_id: str, audio: UploadFile) -> VoiceCommandResponse:
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    state = require_session(session_id)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio uploaded")
    stt = await transcribe_voice(audio_bytes, audio.filename or "voice.webm")
    transcript = stt.get("transcript", "")
    if not transcript.strip():
        spoken_reply = "माफ़ कीजिये, आवाज़ साफ़ नहीं आई, कृपया दोबारा बोलें।"
        audio_b64 = await synthesize_voice(spoken_reply, "hi-IN")
        return VoiceCommandResponse(
            state=state,
            transcript=transcript,
            spoken_reply=spoken_reply,
            audio_base64=audio_b64,
        )
    updated_state, decision = await process_voice_command(state, transcript)
    save_session(updated_state)
    audio_b64 = await synthesize_voice(
        decision.spoken_reply,
        decision.target_language_code,
    )
    return VoiceCommandResponse(
        state=updated_state,
        transcript=transcript,
        spoken_reply=decision.spoken_reply,
        audio_base64=audio_b64,
    )


@app.post("/api/bill/{session_id}/text", response_model=VoiceCommandResponse)
async def text_command(session_id: str, body: TextCommandRequest) -> VoiceCommandResponse:
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    state = require_session(session_id)
    transcript = body.text.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Text command is empty")
    updated_state, decision = await process_voice_command(state, transcript)
    save_session(updated_state)
    audio_b64 = await synthesize_voice(
        decision.spoken_reply,
        decision.target_language_code,
    )
    return VoiceCommandResponse(
        state=updated_state,
        transcript=transcript,
        spoken_reply=decision.spoken_reply,
        audio_base64=audio_b64,
    )


FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

