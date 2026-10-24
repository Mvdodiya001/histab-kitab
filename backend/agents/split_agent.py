from agents.tools import apply_agent_decision
from models.schemas import AgentDecision, BillState
from services.sarvam_service import run_split_agent_llm


async def process_voice_command(state: BillState, transcript: str) -> tuple[BillState, AgentDecision]:
    bill_json = state.model_dump_json()
    decision = await run_split_agent_llm(bill_json, transcript)
    updated = apply_agent_decision(state.model_copy(deep=True), decision)
    return updated, decision
