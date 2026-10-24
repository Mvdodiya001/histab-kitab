from typing import Dict, Optional

from models.schemas import BillState

_sessions: Dict[str, BillState] = {}


def save_session(state: BillState) -> BillState:
    _sessions[state.session_id] = state
    return state


def get_session(session_id: str) -> Optional[BillState]:
    return _sessions.get(session_id)


def session_exists(session_id: str) -> bool:
    return session_id in _sessions
