"""
CampusCoPilot – Planner Agent
Orchestrates: PDF parse → topic extraction → RAG context → campaign generation.
"""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.agents.prompts import (
    EXTRACT_TOPICS_PROMPT,
    GENERATE_CAMPAIGN_PROMPT,
    GENERATE_SEMESTER_CAMPAIGN_PROMPT,
    REPLAN_PROMPT,
    SYSTEM_PERSONA,
    HALLUCINATE_SYLLABUS_PROMPT,
)
from backend.services.pdf_parser import (
    chunk_text,
    extract_text_from_pdf,
    extract_topics_heuristic,
)
from backend.services.vector_store import index_chunks, query_similar, reset_collection

import asyncio
import httpx

from backend.config import AZURE_DI_ENDPOINT, AZURE_DI_KEY


async def extract_text_from_image(file_path: str | Path) -> str:
    if not AZURE_DI_ENDPOINT or not AZURE_DI_KEY:
        raise ValueError("AZURE_DI_ENDPOINT and AZURE_DI_KEY must be set in environment.")

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    url = f"{AZURE_DI_ENDPOINT.rstrip('/')}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_DI_KEY,
        "Content-Type": "application/octet-stream"
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, headers=headers, content=file_bytes)
        if response.status_code != 202:
            raise Exception(f"Azure API Error {response.status_code}: {response.text}")

        operation_location = response.headers.get("Operation-Location")

        for _ in range(30):
            await asyncio.sleep(1)
            poll_resp = await client.get(
                operation_location,
                headers={"Ocp-Apim-Subscription-Key": AZURE_DI_KEY},
            )
            poll_data = poll_resp.json()

            status = poll_data.get("status")
            if status == "succeeded":
                return poll_data.get("analyzeResult", {}).get("content", "")
            elif status == "failed":
                raise Exception("Azure Image Extraction Failed.")

    raise Exception("Image extraction polling timed out.")

logger = logging.getLogger("campuscopilot.planner")


async def synthesize_college_syllabus(university: str, branch: str, semester: str) -> List[Dict[str, Any]]:
    """Generates a realistic syllabus given a university, major, and semester."""
    prompt = HALLUCINATE_SYLLABUS_PROMPT.format(
        university=university or "General University",
        branch=branch or "General Studies",
        semester=semester or "Semester 1"
    )
    subjects = await chat_completion_json(
        messages=[
            {"role": "system", "content": SYSTEM_PERSONA},
            {"role": "user", "content": prompt},
        ]
    )
    if isinstance(subjects, dict) and "subjects" in subjects:
        subjects = subjects["subjects"]
    if not isinstance(subjects, list):
        subjects = []
    return subjects

async def process_syllabus(file_path: str | Path, is_image: bool = False) -> Dict[str, Any]:
    """
    Full pipeline:
      1. Extract text from PDF or Image
      2. Chunk text & index in ChromaDB
      3. Ask Llama to extract structured topics
    Returns {"topics": [...], "total_pages": int, "raw_text_preview": str}
    """
    # Step 1: extract
    if is_image:
        raw_text = await extract_text_from_image(file_path)
        page_count = 1
        logger.info("Extracted text from image: %s", file_path)
    else:
        raw_text, page_count = extract_text_from_pdf(file_path)
        logger.info("Extracted %d pages from %s", page_count, file_path)

    # Step 2: chunk & index (reset old data first)
    reset_collection()
    chunks = chunk_text(raw_text)
    if chunks:
        num_indexed = index_chunks(
            chunks,
            metadata_list=[{"source": str(file_path), "chunk_idx": i} for i in range(len(chunks))],
        )
        logger.info("Indexed %d chunks into ChromaDB", num_indexed)
    else:
        logger.warning("No text chunks extracted from PDF – skipping vector indexing")

    if not raw_text.strip():
        raise ValueError(
            "Could not extract any text from this PDF. "
            "It may be a scanned/image-based file. Try a text-based PDF."
        )

    # Step 3: ask Llama to extract topics (use first ~3000 chars to save tokens)
    truncated = raw_text[:3000]
    prompt = EXTRACT_TOPICS_PROMPT.format(syllabus_text=truncated)
    topics = await chat_completion_json(
        messages=[
            {"role": "system", "content": SYSTEM_PERSONA},
            {"role": "user", "content": prompt},
        ]
    )

    # If Llama wraps the array in an object, unwrap it
    if isinstance(topics, dict):
        # Try common wrapper keys: "topics", "modules", first list value
        for key in ("topics", "modules", "data"):
            if key in topics and isinstance(topics[key], list):
                topics = topics[key]
                break
        else:
            # Grab the first list value from the dict
            for v in topics.values():
                if isinstance(v, list):
                    topics = v
                    break

    # If still not a list, fall back to heuristic
    if not isinstance(topics, list):
        logger.warning("Llama did not return a list; using heuristic fallback.")
        heuristic_topics = extract_topics_heuristic(raw_text)
        topics = [{"topic": t, "subtopics": [], "estimated_hours": None} for t in heuristic_topics]

    return {
        "topics": topics,
        "total_pages": page_count,
        "raw_text_preview": raw_text[:500],
    }


async def generate_campaign(
    topics: List[Dict[str, Any]],
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Given extracted topics + student constraints, ask Llama to produce a
    full weekly study campaign.
    """
    constraints = constraints or {}
    student_name = constraints.get("name", "Student")
    hours_per_day = constraints.get("available_hours_per_day", 4.0)
    weak_subjects = ", ".join(constraints.get("weak_subjects", [])) or "None specified"
    language = constraints.get("language_preference", "English")
    fragmented = "Yes" if constraints.get("fragmented_schedule") else "No"
    exam_date = constraints.get("exam_date", "Not specified")
    additional_notes = constraints.get("additional_notes", "None")
    additional_events = constraints.get("additional_events", [])

    # Retrieve RAG context for the first few topics
    top_topic_names = [t.get("topic", "") for t in topics[:5]]
    rag_query = "Key concepts for: " + ", ".join(top_topic_names)
    rag_chunks = query_similar(rag_query, n_results=3)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "(no additional context)"

    prompt = GENERATE_CAMPAIGN_PROMPT.format(
        student_name=student_name,
        hours_per_day=hours_per_day,
        weak_subjects=weak_subjects,
        language=language,
        fragmented=fragmented,
        exam_date=exam_date,
        additional_notes=additional_notes,
        topics_json=json.dumps(topics, indent=2),
        rag_context=rag_context,
        additional_events_json=json.dumps(additional_events, indent=2),
    )

    campaign = await chat_completion_json(
        messages=[
            {"role": "system", "content": SYSTEM_PERSONA},
            {"role": "user", "content": prompt},
        ],
        max_tokens=4096,
    )

    # Safety: recursively unwrap if the LLM returned stringified JSON
    for _ in range(3):
        if isinstance(campaign, str):
            try:
                campaign = json.loads(campaign)
            except (json.JSONDecodeError, TypeError):
                logger.warning("Campaign response is not valid JSON string")
                break
        else:
            break

    logger.info("generate_campaign final type: %s, has weekly_plans: %s",
                type(campaign).__name__,
                'weekly_plans' in campaign if isinstance(campaign, dict) else 'N/A')

    return campaign


async def replan_campaign(
    campaign: Dict[str, Any],
    disruption: Dict[str, Any],
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Re-plan an existing campaign after a disruption event.
    """
    prompt = REPLAN_PROMPT.format(
        event_type=disruption.get("event_type", "unknown"),
        affected_day=disruption.get("affected_day", "unknown"),
        description=disruption.get("description", ""),
        campaign_json=json.dumps(campaign, indent=2),
        constraints_json=json.dumps(constraints or {}, indent=2),
    )

    updated = await chat_completion_json(
        messages=[
            {"role": "system", "content": SYSTEM_PERSONA},
            {"role": "user", "content": prompt},
        ]
    )

    # Safety: if the LLM returned a JSON string instead of a dict, parse it
    if isinstance(updated, str):
        try:
            updated = json.loads(updated)
        except json.JSONDecodeError:
            logger.warning("Replan response is not valid JSON")

    return updated


async def generate_semester_campaign(
    subjects: List[Dict[str, Any]],
    semester_info: Dict[str, Any],
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generate a comprehensive semester campaign covering ALL subjects.
    subjects: list of {name, topics: [...], weak: bool, credits: int}
    semester_info: {university, branch, semester_type, semester_number, semester_start, midterm_*, endterm_*}
    """
    constraints = constraints or {}
    student_name = constraints.get("name", "Student")
    hours_per_day = constraints.get("available_hours_per_day", 4.0)
    language = constraints.get("language_preference", "English")
    fragmented = "Yes" if constraints.get("fragmented_schedule") else "No"
    study_style = constraints.get("study_style", "balanced")
    target_career_track = constraints.get("target_career_track", "Core Engineering")
    additional_notes = constraints.get("additional_notes", "None")
    unavailable_hours = constraints.get("unavailable_hours", "None")
    additional_events = constraints.get("additional_events", [])

    # Build subjects JSON for prompt
    subjects_data = []
    all_topic_names = []
    for subj in subjects:
        topic_list = subj.get("topics", [])
        weak = subj.get("weak", False)
        subjects_data.append({
            "subject": subj["name"],
            "credits": subj.get("credits"),
            "weak": weak,
            "target_completion_date": subj.get("target_completion_date"),
            "topics": topic_list,
        })
        for t in topic_list[:3]:
            name = t.get("topic", "") if isinstance(t, dict) else str(t)
            if name:
                all_topic_names.append(name)

    # RAG context from vector store
    if all_topic_names:
        rag_query = "Key concepts for: " + ", ".join(all_topic_names[:8])
        rag_chunks = query_similar(rag_query, n_results=3)
        rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "(no additional context)"
    else:
        rag_context = "(no additional context)"

    subject_names = [s["name"] for s in subjects]

    prompt = GENERATE_SEMESTER_CAMPAIGN_PROMPT.format(
        student_name=student_name,
        university=semester_info.get("university", "Not specified"),
        branch=semester_info.get("branch", "Not specified"),
        semester_number=semester_info.get("semester_number", "Not specified"),
        semester_type=semester_info.get("semester_type", "autumn"),
        semester_start=semester_info.get("semester_start", "Not specified"),
        midterm_start=semester_info.get("midterm_start", "Not specified"),
        midterm_end=semester_info.get("midterm_end", "Not specified"),
        endterm_start=semester_info.get("endterm_start", "Not specified"),
        endterm_end=semester_info.get("endterm_end", "Not specified"),
        hours_per_day=hours_per_day,
        study_style=study_style,
        language=language,
        fragmented=fragmented,
        target_career_track=target_career_track,
        additional_notes=additional_notes,
        unavailable_hours=unavailable_hours,
        num_subjects=len(subjects),
        subjects_json=json.dumps(subjects_data, indent=2),
        rag_context=rag_context,
        additional_events_json=json.dumps(additional_events, indent=2),
        subject_list='", "'.join(subject_names),
    )

    campaign = await chat_completion_json(
        messages=[
            {"role": "system", "content": SYSTEM_PERSONA},
            {"role": "user", "content": prompt},
        ],
        max_tokens=4096,
    )

    # Safety: recursively unwrap stringified JSON
    for _ in range(3):
        if isinstance(campaign, str):
            try:
                campaign = json.loads(campaign)
            except (json.JSONDecodeError, TypeError):
                logger.warning("Semester campaign response is not valid JSON string")
                break
        else:
            break

    logger.info(
        "generate_semester_campaign final type: %s, has weekly_plans: %s",
        type(campaign).__name__,
        "weekly_plans" in campaign if isinstance(campaign, dict) else "N/A",
    )

    return campaign
