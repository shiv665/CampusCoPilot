"""
CampusCoPilot – Database connection layer.
Supports MongoDB Atlas and Azure Cosmos DB for MongoDB API via Motor (async driver).
Auto-detects Cosmos DB from the connection string and applies the right settings.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.config import MONGO_DB_NAME, MONGO_URI

logger = logging.getLogger("campuscopilot.db")

_is_cosmos: bool = False


def _detect_cosmos(uri: str) -> bool:
    """Return True if the URI points to Azure Cosmos DB."""
    return ".cosmos.azure.com" in uri or ".cosmos." in uri


# ── Singleton client ─────────────────────────────────────────────────
_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global _client, _is_cosmos
    if _client is None:
        if not MONGO_URI:
            raise RuntimeError(
                "MONGO_URI is not set. Add your MongoDB Atlas or Azure Cosmos DB "
                "connection string to .env"
            )
        _is_cosmos = _detect_cosmos(MONGO_URI)
        kwargs: dict = {"serverSelectionTimeoutMS": 10000}
        if _is_cosmos:
            kwargs["tls"] = True
            kwargs["retryWrites"] = False
        _client = AsyncIOMotorClient(MONGO_URI, **kwargs)
        host_info = MONGO_URI.split("@")[-1].split("?")[0] if "@" in MONGO_URI else MONGO_URI
        flavour = "Cosmos DB" if _is_cosmos else "MongoDB Atlas"
        logger.info("%s client created for: %s", flavour, host_info)
    return _client


def get_db():
    return get_client()[MONGO_DB_NAME]


async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None


# ── Helper: make docs JSON-serializable ──────────────────────────────
def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId and datetime fields to strings for JSON serialization."""
    if doc is None:
        return None
    doc = dict(doc)
    for key, val in doc.items():
        if isinstance(val, ObjectId):
            doc[key] = str(val)
        elif isinstance(val, datetime):
            doc[key] = val.isoformat()
        elif isinstance(val, list):
            doc[key] = [
                str(v) if isinstance(v, ObjectId)
                else v.isoformat() if isinstance(v, datetime)
                else v
                for v in val
            ]
    return doc


# ══════════════════════════════════════════════════════════════════════
#  USER OPERATIONS
# ══════════════════════════════════════════════════════════════════════

async def create_user(email: str, name: str, password_hash: str) -> dict:
    db = get_db()
    doc = {
        "email": email.lower().strip(),
        "name": name.strip(),
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def find_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    doc = await db.users.find_one({"email": email.lower().strip()})
    return doc  # keep raw for password check


async def find_user_by_id(user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(doc) if doc else None


async def ensure_indexes():
    """Create indexes on first startup.
    Cosmos DB requires unique indexes to be created on empty collections.
    Wraps each in try/except so the app starts even if indexes already exist.
    """
    db = get_db()
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.debug("users.email index: %s", e)
    try:
        await db.sessions.create_index("user_id")
    except Exception as e:
        logger.debug("sessions.user_id index: %s", e)
    try:
        await db.sessions.create_index([("user_id", 1), ("updated_at", -1)])
    except Exception as e:
        logger.debug("sessions compound index: %s", e)
    logger.info("Cosmos DB indexes ensured.")


# ══════════════════════════════════════════════════════════════════════
#  SESSION (syllabus + campaign + schedule per user)
# ══════════════════════════════════════════════════════════════════════

async def get_user_sessions(user_id: str) -> List[dict]:
    db = get_db()
    cursor = db.sessions.find(
        {"user_id": ObjectId(user_id)},
        {"campaign.weekly_plans": 0, "schedule": 0},  # exclude heavy portions, keep campaign truthy 
    ).sort("updated_at", -1)
    docs = await cursor.to_list(length=50)
    return [serialize_doc(d) for d in docs]


async def get_session(session_id: str, user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": ObjectId(user_id),
    })
    return serialize_doc(doc) if doc else None


async def create_session(user_id: str, filename: str, topics: list, raw_text_preview: str, total_pages: int, syllabus_file_id: Optional[str] = None) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "filename": filename,
        "topics": topics,
        "raw_text_preview": raw_text_preview,
        "total_pages": total_pages,
        "syllabus_file_id": syllabus_file_id,
        "campaign": None,
        "schedule": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def update_session_campaign(session_id: str, user_id: str, campaign: Any) -> bool:
    db = get_db()
    result = await db.sessions.update_one(
        {"_id": ObjectId(session_id), "user_id": ObjectId(user_id)},
        {"$set": {"campaign": campaign, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def update_session_schedule(session_id: str, user_id: str, schedule: Any) -> bool:
    db = get_db()
    result = await db.sessions.update_one(
        {"_id": ObjectId(session_id), "user_id": ObjectId(user_id)},
        {"$set": {"schedule": schedule, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def delete_session(session_id: str, user_id: str) -> bool:
    db = get_db()
    result = await db.sessions.delete_one({
        "_id": ObjectId(session_id),
        "user_id": ObjectId(user_id),
    })
    return result.deleted_count > 0


# ══════════════════════════════════════════════════════════════════════
#  PDF STORAGE (binary in a dedicated collection — Cosmos DB compatible)
# ══════════════════════════════════════════════════════════════════════

async def store_pdf(filename: str, data: bytes, user_id: str) -> str:
    """Store a PDF as a binary document. Returns the doc _id as a string."""
    import base64
    db = get_db()
    doc = {
        "filename": filename,
        "user_id": user_id,
        "content_type": "application/pdf",
        "data": base64.b64encode(data).decode("ascii"),
        "size": len(data),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.pdfs.insert_one(doc)
    return str(result.inserted_id)


async def get_pdf(file_id: str) -> Optional[bytes]:
    """Download a PDF by its document _id."""
    import base64
    db = get_db()
    try:
        doc = await db.pdfs.find_one({"_id": ObjectId(file_id)})
        if doc and "data" in doc:
            return base64.b64decode(doc["data"])
        return None
    except Exception:
        return None


async def store_avatar(user_id: str, data: bytes, content_type: str) -> None:
    """Store a profile avatar image as a binary document for the user."""
    import base64
    db = get_db()
    doc = {
        "content_type": content_type,
        "data": base64.b64encode(data).decode("ascii"),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.avatars.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": doc},
        upsert=True
    )


async def get_avatar(user_id: str) -> dict | None:
    """Get the profile avatar binary data and content type."""
    import base64
    db = get_db()
    try:
        doc = await db.avatars.find_one({"user_id": ObjectId(user_id)})
        if doc and "data" in doc:
            return {
                "content_type": doc.get("content_type", "image/png"),
                "data": base64.b64decode(doc["data"])
            }
        return None
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════════════
#  USER PROFILE & GOALS
# ══════════════════════════════════════════════════════════════════════

async def get_profile(user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.profiles.find_one({"user_id": ObjectId(user_id)})
    return serialize_doc(doc) if doc else None


async def upsert_profile(user_id: str, data: dict) -> dict:
    db = get_db()
    data["user_id"] = ObjectId(user_id)
    data["updated_at"] = datetime.now(timezone.utc)
    result = await db.profiles.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": data, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return await get_profile(user_id)


# ══════════════════════════════════════════════════════════════════════
#  TASK COMPLETION / PROGRESS TRACKING
# ══════════════════════════════════════════════════════════════════════

async def log_task_completion(user_id: str, session_id: str, task_data: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "session_id": session_id,
        "task": task_data.get("task", ""),
        "topic": task_data.get("topic", ""),
        "duration_minutes": task_data.get("duration_minutes", 0),
        "completed_at": datetime.now(timezone.utc),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    result = await db.task_completions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_user_completions(user_id: str, limit: int = 100) -> List[dict]:
    db = get_db()
    cursor = db.task_completions.find(
        {"user_id": ObjectId(user_id)},
    ).sort("completed_at", -1).limit(limit)
    return [serialize_doc(d) for d in await cursor.to_list(length=limit)]


async def get_completion_dates(user_id: str) -> List[str]:
    """Return unique date strings (YYYY-MM-DD) on which the user completed tasks."""
    db = get_db()
    cursor = db.task_completions.find(
        {"user_id": ObjectId(user_id)},
        {"date": 1},
    )
    docs = await cursor.to_list(length=5000)
    return list(set(d.get("date", "") for d in docs if d.get("date")))


# ══════════════════════════════════════════════════════════════════════
#  POMODORO SESSIONS
# ══════════════════════════════════════════════════════════════════════

async def log_pomodoro(user_id: str, data: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "task": data.get("task", ""),
        "duration_minutes": data.get("duration_minutes", 25),
        "completed": data.get("completed", True),
        "started_at": data.get("started_at", datetime.now(timezone.utc).isoformat()),
        "created_at": datetime.now(timezone.utc),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    result = await db.pomodoros.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_pomodoro_count(user_id: str) -> int:
    db = get_db()
    return await db.pomodoros.count_documents({"user_id": ObjectId(user_id), "completed": True})


# ══════════════════════════════════════════════════════════════════════
#  QUIZ RESULTS
# ══════════════════════════════════════════════════════════════════════

async def save_quiz_result(user_id: str, data: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "topic": data.get("topic", ""),
        "score": data.get("score", 0),
        "total": data.get("total", 0),
        "answers": data.get("answers", []),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.quiz_results.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_quiz_results(user_id: str, limit: int = 50) -> List[dict]:
    db = get_db()
    cursor = db.quiz_results.find(
        {"user_id": ObjectId(user_id)},
    ).sort("created_at", -1).limit(limit)
    return [serialize_doc(d) for d in await cursor.to_list(length=limit)]


async def get_perfect_quiz_count(user_id: str) -> int:
    db = get_db()
    return await db.quiz_results.count_documents({
        "user_id": ObjectId(user_id),
        "$expr": {"$eq": ["$score", "$total"]},
    })


# ══════════════════════════════════════════════════════════════════════
#  CAREER & PORTFOLIO
# ══════════════════════════════════════════════════════════════════════

async def add_portfolio_entry(user_id: str, entry: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "title": entry.get("title", ""),
        "description": entry.get("description", ""),
        "skills": entry.get("skills", []),
        "category": entry.get("category", "project"),  # project, certification, achievement
        "date": entry.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.portfolio.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_portfolio(user_id: str) -> List[dict]:
    db = get_db()
    cursor = db.portfolio.find(
        {"user_id": ObjectId(user_id)},
    ).sort("created_at", -1)
    return [serialize_doc(d) for d in await cursor.to_list(length=100)]


async def delete_portfolio_entry(user_id: str, entry_id: str) -> bool:
    db = get_db()
    result = await db.portfolio.delete_one({
        "_id": ObjectId(entry_id),
        "user_id": ObjectId(user_id),
    })
    return result.deleted_count > 0


# ══════════════════════════════════════════════════════════════════════
#  STUDY SQUADS
# ══════════════════════════════════════════════════════════════════════

async def create_squad(creator_id: str, data: dict) -> dict:
    db = get_db()
    doc = {
        "creator_id": ObjectId(creator_id),
        "name": data.get("name", "Study Squad"),
        "topic": data.get("topic", ""),
        "members": [ObjectId(creator_id)],
        "max_members": data.get("max_members", 5),
        "invite_code": data.get("invite_code", ""),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.squads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def join_squad(user_id: str, invite_code: str) -> Optional[dict]:
    db = get_db()
    squad = await db.squads.find_one({"invite_code": invite_code})
    if not squad:
        return None
    if ObjectId(user_id) in squad.get("members", []):
        return serialize_doc(squad)  # already a member
    if len(squad.get("members", [])) >= squad.get("max_members", 5):
        return None  # full
    await db.squads.update_one(
        {"_id": squad["_id"]},
        {"$push": {"members": ObjectId(user_id)}},
    )
    return serialize_doc(await db.squads.find_one({"_id": squad["_id"]}))


async def get_user_squads(user_id: str) -> List[dict]:
    db = get_db()
    cursor = db.squads.find({"members": ObjectId(user_id)})
    docs = await cursor.to_list(length=20)
    
    for doc in docs:
        populated_members = []
        for p_id in doc.get("members", []):
            user_doc = await db.users.find_one({"_id": p_id})
            if user_doc:
                populated_members.append({"_id": str(p_id), "name": user_doc.get("name", "Unknown Student")})
            else:
                populated_members.append({"_id": str(p_id), "name": "Unknown Student"})
        doc["members"] = populated_members

    return [serialize_doc(d) for d in docs]


async def leave_squad(user_id: str, squad_id: str) -> bool:
    db = get_db()
    result = await db.squads.update_one(
        {"_id": ObjectId(squad_id)},
        {"$pull": {"members": ObjectId(user_id)}},
    )
    return result.modified_count > 0


# ══════════════════════════════════════════════════════════════════════
#  ANALYTICS HELPERS
# ══════════════════════════════════════════════════════════════════════

async def get_user_metrics(user_id: str) -> dict:
    """Aggregate user metrics for analytics and badge checking."""
    db = get_db()
    oid = ObjectId(user_id)

    total_sessions = await db.sessions.count_documents({"user_id": oid})
    campaigns_completed = await db.sessions.count_documents({"user_id": oid, "campaign": {"$ne": None}})
    pomodoro_count = await db.pomodoros.count_documents({"user_id": oid, "completed": True})

    # Count unique topics from completions
    completions = await db.task_completions.find({"user_id": oid}, {"topic": 1}).to_list(length=5000)
    topics_completed = len(set(c.get("topic", "") for c in completions if c.get("topic")))

    # Completion dates for streak
    dates = [c.get("date", "") for c in await db.task_completions.find({"user_id": oid}, {"date": 1}).to_list(length=5000)]

    # Perfect quizzes
    perfect_quizzes = 0
    quiz_results = await db.quiz_results.find({"user_id": oid}).to_list(length=500)
    for q in quiz_results:
        if q.get("score") and q.get("total") and q["score"] >= q["total"]:
            perfect_quizzes += 1

    # Time-based sessions
    early_sessions = 0
    late_sessions = 0
    pomo_docs = await db.pomodoros.find({"user_id": oid}).to_list(length=5000)
    for p in pomo_docs:
        started = p.get("started_at", "")
        if isinstance(started, str) and "T" in started:
            hour_str = started.split("T")[1][:2]
            try:
                hour = int(hour_str)
                if hour < 8:
                    early_sessions += 1
                if hour >= 22:
                    late_sessions += 1
            except ValueError:
                pass

    # Total study minutes
    total_minutes = sum(c.get("duration_minutes", 0) for c in completions)

    return {
        "total_sessions": total_sessions,
        "campaigns_completed": campaigns_completed,
        "pomodoro_count": pomodoro_count,
        "topics_completed": topics_completed,
        "completion_dates": list(set(dates)),
        "perfect_quizzes": perfect_quizzes,
        "early_sessions": early_sessions,
        "late_sessions": late_sessions,
        "total_study_minutes": total_minutes,
        "quiz_count": len(quiz_results),
    }


# ══════════════════════════════════════════════════════════════════════
#  SEMESTER PLANS (multi-subject planner)
# ══════════════════════════════════════════════════════════════════════

async def create_semester_plan(user_id: str, data: dict) -> dict:
    db = get_db()
    doc = {
        "user_id": ObjectId(user_id),
        "university": data.get("university", ""),
        "branch": data.get("branch", ""),
        "semester_type": data.get("semester_type", "autumn"),
        "semester_number": data.get("semester_number", ""),
        "semester_start": data.get("semester_start"),
        "midterm_start": data.get("midterm_start"),
        "midterm_end": data.get("midterm_end"),
        "endterm_start": data.get("endterm_start"),
        "endterm_end": data.get("endterm_end"),
        "dates_released": data.get("dates_released", False),
        "subjects": data.get("subjects", []),
        "campaign": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.semester_plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_semester_plan(plan_id: str, user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.semester_plans.find_one({
        "_id": ObjectId(plan_id),
        "user_id": ObjectId(user_id),
    })
    return serialize_doc(doc) if doc else None


async def get_user_semester_plans(user_id: str) -> List[dict]:
    db = get_db()
    cursor = db.semester_plans.find(
        {"user_id": ObjectId(user_id)},
        {"campaign.weekly_plans": 0, "subjects.topics": 0}, # exclude heavy portions
    ).sort("updated_at", -1)
    docs = await cursor.to_list(length=50)
    return [serialize_doc(d) for d in docs]


async def update_semester_subjects(plan_id: str, user_id: str, subjects: list) -> bool:
    db = get_db()
    result = await db.semester_plans.update_one(
        {"_id": ObjectId(plan_id), "user_id": ObjectId(user_id)},
        {"$set": {"subjects": subjects, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def update_semester_campaign(plan_id: str, user_id: str, campaign: Any) -> bool:
    db = get_db()
    result = await db.semester_plans.update_one(
        {"_id": ObjectId(plan_id), "user_id": ObjectId(user_id)},
        {"$set": {"campaign": campaign, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def delete_semester_plan(plan_id: str, user_id: str) -> bool:
    db = get_db()
    result = await db.semester_plans.delete_one({
        "_id": ObjectId(plan_id),
        "user_id": ObjectId(user_id),
    })
    return result.deleted_count > 0


async def find_study_groups(university: str = "", branch: str = "") -> List[dict]:
    """Find other users with the same university/branch for study groups."""
    db = get_db()
    query: dict = {}
    if university:
        query["university"] = {"$regex": university, "$options": "i"}
    if branch:
        query["branch"] = {"$regex": branch, "$options": "i"}
    if not query:
        return []
    cursor = db.semester_plans.find(query, {"campaign": 0}).sort("updated_at", -1)
    docs = await cursor.to_list(length=100)
    return [serialize_doc(d) for d in docs]
