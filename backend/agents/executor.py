"""
CampusCoPilot – Executor Agent
Action & Engagement Driver: manages focus sessions, task completion tracking,
Pomodoro sessions, streak management, and well-being nudges.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.agents.prompts import EXECUTOR_SYSTEM, WELLBEING_NUDGE_PROMPT, FOCUS_SESSION_PROMPT
from backend.services.llama_client import chat_completion_json

logger = logging.getLogger("campuscopilot.executor")


async def generate_focus_session(
    task: str,
    duration_minutes: int = 25,
    difficulty: str = "medium",
    language: str = "English",
) -> Dict[str, Any]:
    """
    Generate a structured focus session plan for a given task.
    Includes Pomodoro timings, mini-goals, and completion checklist.
    """
    prompt = FOCUS_SESSION_PROMPT.format(
        task=task,
        duration=duration_minutes,
        difficulty=difficulty,
        language=language,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": EXECUTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"task": task, "plan": result}

    if not isinstance(result, dict):
        result = {"task": task, "raw": result}

    result.setdefault("task", task)
    result.setdefault("duration_minutes", duration_minutes)
    return result


async def generate_wellbeing_nudge(
    recent_activity: Dict[str, Any],
    language: str = "English",
) -> Dict[str, Any]:
    """
    Analyze recent study activity and generate well-being recommendations.
    - Break suggestions
    - Workload warnings
    - Motivational nudges
    - Lighter-day recommendations
    """
    prompt = WELLBEING_NUDGE_PROMPT.format(
        activity_json=json.dumps(recent_activity, indent=2),
        language=language,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": EXECUTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"nudge": result}

    return result


def calculate_streak(completion_dates: List[str]) -> Dict[str, Any]:
    """
    Calculate current and longest streak from a list of date strings (YYYY-MM-DD).
    Pure computation — no AI needed.
    """
    if not completion_dates:
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0}

    dates = sorted(set(completion_dates))
    parsed = []
    for d in dates:
        try:
            parsed.append(datetime.strptime(d, "%Y-%m-%d").date())
        except ValueError:
            continue

    if not parsed:
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0}

    # Calculate streaks
    longest = 1
    current = 1
    for i in range(1, len(parsed)):
        diff = (parsed[i] - parsed[i - 1]).days
        if diff == 1:
            current += 1
            longest = max(longest, current)
        elif diff > 1:
            current = 1

    # Check if the latest date is today or yesterday (streak still active)
    today = datetime.now(timezone.utc).date()
    days_since_last = (today - parsed[-1]).days
    if days_since_last > 1:
        current = 0  # streak broken

    return {
        "current_streak": current,
        "longest_streak": longest,
        "total_days": len(parsed),
    }


BADGE_DEFINITIONS = [
    {"id": "first_session", "name": "First Steps", "icon": "🌱", "description": "Complete your first study session", "threshold": 1, "metric": "total_sessions"},
    {"id": "streak_3", "name": "On Fire", "icon": "🔥", "description": "3-day study streak", "threshold": 3, "metric": "current_streak"},
    {"id": "streak_7", "name": "Week Warrior", "icon": "⚔️", "description": "7-day study streak", "threshold": 7, "metric": "current_streak"},
    {"id": "streak_30", "name": "Monthly Master", "icon": "🏆", "description": "30-day study streak", "threshold": 30, "metric": "current_streak"},
    {"id": "topics_10", "name": "Knowledge Seeker", "icon": "📚", "description": "Study 10 different topics", "threshold": 10, "metric": "topics_completed"},
    {"id": "topics_50", "name": "Scholar", "icon": "🎓", "description": "Study 50 different topics", "threshold": 50, "metric": "topics_completed"},
    {"id": "pomodoro_10", "name": "Focus Beginner", "icon": "🍅", "description": "Complete 10 Pomodoro sessions", "threshold": 10, "metric": "pomodoro_count"},
    {"id": "pomodoro_100", "name": "Focus Master", "icon": "🧘", "description": "Complete 100 Pomodoro sessions", "threshold": 100, "metric": "pomodoro_count"},
    {"id": "quiz_ace", "name": "Quiz Ace", "icon": "💯", "description": "Score 100% on 5 quizzes", "threshold": 5, "metric": "perfect_quizzes"},
    {"id": "early_bird", "name": "Early Bird", "icon": "🌅", "description": "Study before 8 AM, 5 times", "threshold": 5, "metric": "early_sessions"},
    {"id": "night_owl", "name": "Night Owl", "icon": "🦉", "description": "Study after 10 PM, 5 times", "threshold": 5, "metric": "late_sessions"},
    {"id": "campaign_complete", "name": "Campaign Victor", "icon": "🏅", "description": "Complete an entire study campaign", "threshold": 1, "metric": "campaigns_completed"},
]


def check_badges(metrics: Dict[str, int]) -> List[Dict[str, Any]]:
    """
    Given user metrics, return list of earned badges.
    """
    earned = []
    for badge in BADGE_DEFINITIONS:
        val = metrics.get(badge["metric"], 0)
        if val >= badge["threshold"]:
            earned.append({**badge, "earned": True})
    return earned
