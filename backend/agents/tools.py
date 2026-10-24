from typing import Dict, List, Set

from models.schemas import AgentDecision, BillItem, BillState


def _title_names(names: List[str]) -> List[str]:
    return [name.strip().title() for name in names if name and name.strip()]


def recalculate_splits(state: BillState) -> BillState:
    items_subtotal = sum(item.total_price for item in state.items)
    person_subtotals: Dict[str, float] = {}
    unassigned_total = 0.0
    participants: Set[str] = set()

    for item in state.items:
        item.assigned_to = _title_names(item.assigned_to)
        if len(item.assigned_to) > 0:
            share = item.total_price / len(item.assigned_to)
            for person in item.assigned_to:
                participants.add(person)
                person_subtotals[person] = person_subtotals.get(person, 0.0) + share
        else:
            unassigned_total += item.total_price

    state.participants = sorted(participants)
    state.unassigned_total = round(unassigned_total, 2)

    person_totals: Dict[str, float] = {}
    if items_subtotal > 0 and state.tax_and_fees > 0:
        for person, subtotal in person_subtotals.items():
            person_tax = state.tax_and_fees * (subtotal / items_subtotal)
            person_totals[person] = round(subtotal + person_tax, 2)
    else:
        for person, subtotal in person_subtotals.items():
            person_totals[person] = round(subtotal, 2)

    state.person_totals = person_totals
    return state


def apply_agent_decision(state: BillState, decision: AgentDecision) -> BillState:
    valid_ids = {item.item_id for item in state.items}
    items_by_id: Dict[str, BillItem] = {item.item_id: item for item in state.items}

    if decision.action == "assign_items":
        for assignment in decision.assignments:
            if assignment.item_id not in valid_ids:
                continue
            items_by_id[assignment.item_id].assigned_to = _title_names(
                assignment.assigned_to
            )

    elif decision.action == "split_remaining":
        targets = _title_names(decision.participants_for_remaining)
        if not targets:
            targets = list(state.participants)
        if targets:
            for item in state.items:
                if len(item.assigned_to) == 0:
                    item.assigned_to = list(targets)

    elif decision.action == "reset":
        for item in state.items:
            item.assigned_to = []
        state.participants = []
        state.person_totals = {}
        state.unassigned_total = 0.0

    elif decision.action == "clarify":
        pass

    return recalculate_splits(state)
