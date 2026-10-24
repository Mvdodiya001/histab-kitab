from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class BillItem(BaseModel):
    item_id: str
    name: str
    qty: int = 1
    total_price: float
    assigned_to: List[str] = Field(default_factory=list)


class BillState(BaseModel):
    session_id: str
    items: List[BillItem]
    tax_and_fees: float = 0.0
    grand_total: float = 0.0
    participants: List[str] = Field(default_factory=list)
    person_totals: Dict[str, float] = Field(default_factory=dict)
    unassigned_total: float = 0.0


class ItemAssignment(BaseModel):
    item_id: str
    assigned_to: List[str]


class AgentDecision(BaseModel):
    action: Literal["assign_items", "split_remaining", "reset", "clarify"]
    assignments: List[ItemAssignment] = Field(default_factory=list)
    participants_for_remaining: List[str] = Field(default_factory=list)
    spoken_reply: str
    target_language_code: str = "hi-IN"


class VoiceCommandResponse(BaseModel):
    state: BillState
    transcript: str
    spoken_reply: str
    audio_base64: Optional[str] = None


class TextCommandRequest(BaseModel):
    text: str
