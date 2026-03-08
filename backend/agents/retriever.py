"""
CampusCoPilot – Retriever Agent
Knowledge & Context Scout: assembles micro-lessons, videos, practice questions
for each study task in a campaign.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from backend.agents.prompts import RETRIEVER_SYSTEM, RETRIEVE_RESOURCES_PROMPT
from backend.services.llama_client import chat_completion_json
from backend.services.azure_search import search_similar

logger = logging.getLogger("campuscopilot.retriever")


async def retrieve_resources(
    topic: str,
    subtopics: List[str] | None = None,
    language: str = "English",
) -> Dict[str, Any]:
    """
    For a given topic, produce a curated resource pack:
    - Micro-lesson summary
    - Recommended videos (YouTube search queries)
    - Practice questions (MCQ + short answer)
    - Key formulas / definitions
    """
    subtopics = subtopics or []

    # Pull RAG context from the vector store
    rag_chunks = search_similar(f"{topic} {' '.join(subtopics)}", n_results=3)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "(no additional syllabus context)"

    prompt = RETRIEVE_RESOURCES_PROMPT.format(
        topic=topic,
        subtopics=", ".join(subtopics) if subtopics else "None",
        language=language,
        rag_context=rag_context,
    )

    result = await chat_completion_json(
        messages=[
            {"role": "system", "content": RETRIEVER_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )

    # Ensure result is a dict
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            result = {"topic": topic, "micro_lesson": result, "videos": [], "practice_questions": [], "key_points": []}

    if not isinstance(result, dict):
        result = {"topic": topic, "raw": result}

    result.setdefault("topic", topic)
    return result


async def retrieve_for_campaign(
    campaign: Dict[str, Any],
    language: str = "English",
    max_topics: int = 10,
) -> List[Dict[str, Any]]:
    """
    Generate resource packs for the unique topics in a campaign.
    Returns a list of resource dicts, one per topic.
    """
    # Collect unique topics from the campaign
    seen = set()
    topic_list: List[Dict[str, Any]] = []

    for week in campaign.get("weekly_plans", []):
        for day in week.get("days", []):
            ft = day.get("focus_topic", "")
            if ft and ft not in seen:
                seen.add(ft)
                topic_list.append({"topic": ft, "subtopics": []})

    topic_list = topic_list[:max_topics]
    resources = []
    for t in topic_list:
        try:
            r = await retrieve_resources(t["topic"], t.get("subtopics", []), language)
            resources.append(r)
        except Exception as e:
            logger.warning("Failed to retrieve resources for %s: %s", t["topic"], e)
            resources.append({"topic": t["topic"], "error": str(e)})

    return resources
