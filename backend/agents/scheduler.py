"""
CampusCoPilot – Scheduler Agent
Takes a list of fixed + dynamic events and produces an optimised daily schedule.
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List

from backend.agents.prompts import SCHEDULE_EVENTS_PROMPT, SCHEDULER_SYSTEM
from backend.services.llama_client import chat_completion_json

logger = logging.getLogger("campuscopilot.scheduler")


def _today_str() -> str:
    return date.today().isoformat()


def _validate_fixed_events(events: List[Dict[str, Any]]) -> List[str]:
    """Return a list of warning strings for invalid fixed events."""
    warnings: List[str] = []
    for ev in events:
        if ev.get("event_type") == "fixed":
            if not ev.get("fixed_date"):
                warnings.append(f"Fixed event '{ev['event_name']}' has no fixed_date – treating as dynamic.")
                ev["event_type"] = "dynamic"
            if not ev.get("fixed_start_time"):
                warnings.append(f"Fixed event '{ev['event_name']}' has no start time – treating as dynamic.")
                ev["event_type"] = "dynamic"
    return warnings


def _pre_sort_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort: fixed events first (by date), then dynamic events by deadline (earliest first)."""
    fixed = sorted(
        [e for e in events if e.get("event_type") == "fixed"],
        key=lambda e: e.get("fixed_date", "9999-12-31"),
    )
    dynamic = sorted(
        [e for e in events if e.get("event_type") != "fixed"],
        key=lambda e: e.get("deadline", "9999-12-31"),
    )
    return fixed + dynamic


async def build_schedule(
    events: List[Dict[str, Any]],
    hours_per_day: float = 8.0,
    day_start: str = "08:00",
    day_end: str = "22:00",
    break_minutes: int = 15,
) -> Dict[str, Any]:
    """
    Main entry point: validate inputs, call Llama, return structured schedule.
    """
    # Pre-validate
    pre_warnings = _validate_fixed_events(events)
    sorted_events = _pre_sort_events(events)

    fixed_count = sum(1 for e in sorted_events if e.get("event_type") == "fixed")
    dynamic_count = len(sorted_events) - fixed_count

    prompt = SCHEDULE_EVENTS_PROMPT.format(
        hours_per_day=hours_per_day,
        day_start=day_start,
        day_end=day_end,
        break_minutes=break_minutes,
        today=_today_str(),
        events_json=json.dumps(sorted_events, indent=2),
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": SCHEDULER_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    # Inject pre-validation warnings
    if isinstance(result, dict):
        existing_warnings = result.get("warnings", [])
        result["warnings"] = pre_warnings + existing_warnings
        # Ensure counts are correct
        result.setdefault("total_events", len(sorted_events))
        result.setdefault("fixed_events", fixed_count)
        result.setdefault("dynamic_events", dynamic_count)
    else:
        # Llama returned something unexpected – wrap it
        result = {
            "schedule": [],
            "total_events": len(sorted_events),
            "fixed_events": fixed_count,
            "dynamic_events": dynamic_count,
            "warnings": pre_warnings + ["AI returned unexpected format – raw output attached."],
            "_raw": result,
        }

    logger.info(
        "Schedule built: %d events (%d fixed, %d dynamic), %d warnings",
        len(sorted_events), fixed_count, dynamic_count, len(result.get("warnings", [])),
    )
    return result
