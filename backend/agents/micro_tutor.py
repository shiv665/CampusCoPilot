"""
CampusCoPilot – Micro-Tutor Agent
Generates quizzes, flashcards, and adaptive learning content.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from backend.agents.prompts import (
    MICRO_TUTOR_SYSTEM,
    GENERATE_QUIZ_PROMPT,
    GENERATE_FLASHCARDS_PROMPT,
    RESUME_BULLET_PROMPT,
)
from backend.services.llama_client import chat_completion_json
from backend.services.azure_search import search_similar

logger = logging.getLogger("campuscopilot.microtutor")


async def generate_quiz(
    topic: str,
    difficulty: str = "medium",
    num_questions: int = 5,
    language: str = "English",
) -> Dict[str, Any]:
    """Generate a quiz for a specific topic."""
    rag_chunks = search_similar(topic, n_results=3)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "(no additional context)"

    prompt = GENERATE_QUIZ_PROMPT.format(
        topic=topic,
        difficulty=difficulty,
        num_questions=num_questions,
        language=language,
        rag_context=rag_context,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": MICRO_TUTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"topic": topic, "questions": [], "error": "Failed to parse quiz"}

    if not isinstance(result, dict):
        result = {"topic": topic, "raw": result}

    result.setdefault("topic", topic)
    return result


async def generate_flashcards(
    topic: str,
    count: int = 10,
    language: str = "English",
) -> Dict[str, Any]:
    """Generate flashcards for a topic."""
    rag_chunks = search_similar(topic, n_results=3)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "(no additional context)"

    prompt = GENERATE_FLASHCARDS_PROMPT.format(
        topic=topic,
        count=count,
        language=language,
        rag_context=rag_context,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": MICRO_TUTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"topic": topic, "flashcards": [], "error": "Failed to parse flashcards"}

    result.setdefault("topic", topic)
    return result


async def generate_resume_bullets(
    profile: Dict[str, Any],
    portfolio: List[Dict[str, Any]],
    language: str = "English",
) -> Dict[str, Any]:
    """Generate resume bullet points from profile and portfolio."""
    prompt = RESUME_BULLET_PROMPT.format(
        profile_json=json.dumps(profile, indent=2, default=str),
        portfolio_json=json.dumps(portfolio, indent=2, default=str),
        language=language,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": MICRO_TUTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"resume_bullets": [], "error": "Failed to parse resume bullets"}

    return result
