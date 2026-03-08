"""
CampusCoPilot – FastAPI Application (v2)
Now with JWT auth, MongoDB persistence, and per-user sessions.
"""

from __future__ import annotations

# --- Azure App Service SQLite Hack for ChromaDB ---
import sys
try:
    __import__('pysqlite3')
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass  # pysqlite3-binary not installed; use system sqlite3
# --------------------------------------------------

import json
import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from backend.agents.planner import generate_campaign, generate_semester_campaign, process_syllabus, replan_campaign, synthesize_college_syllabus
from backend.agents.scheduler import build_schedule
from backend.agents.retriever import retrieve_resources, retrieve_for_campaign
from backend.agents.executor import (
    generate_focus_session,
    generate_wellbeing_nudge,
    calculate_streak,
    check_badges,
)
from backend.auth import (
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from backend.config import HOST, PORT
from backend.db import (
    close_client,
    create_session,
    create_user,
    delete_session,
    ensure_indexes,
    find_user_by_email,
    find_user_by_id,
    get_session,
    get_user_sessions,
    serialize_doc,
    store_pdf,
    update_session_campaign,
    update_session_schedule,
    get_profile,
    upsert_profile,
    log_task_completion,
    get_user_completions,
    get_completion_dates,
    log_pomodoro,
    get_pomodoro_count,
    save_quiz_result,
    get_quiz_results,
    get_perfect_quiz_count,
    add_portfolio_entry,
    get_portfolio,
    delete_portfolio_entry,
    create_squad,
    join_squad,
    get_user_squads,
    leave_squad,
    get_user_metrics,
    create_semester_plan,
    get_semester_plan,
    get_user_semester_plans,
    update_semester_subjects,
    update_semester_campaign,
    delete_semester_plan,
    find_study_groups,
)
from backend.models.schemas import (
    DisruptionEvent,
    SchedulerInput,
    SemesterInfo,
    SemesterPlanConstraints,
    StudentConstraints,
    SubjectEntry,
)
from backend.services.llama_client import get_token_usage

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-30s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("campuscopilot")

# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(
    title="CampusCoPilot",
    version="2.0.0",
    description="AI-powered personal study planner with auth & persistence.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://campuscopilot-chhagnbhf9gpaqfm.southeastasia-01.azurewebsites.net",
        "https://green-hill-069d71800.4.azurestaticapps.net",
        "https://campuscopilot.me",
        "https://www.campuscopilot.me",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup / Shutdown ───────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    try:
        await ensure_indexes()
    except Exception as e:
        logger.warning("Could not connect to MongoDB: %s — start MongoDB or set MONGO_URI in .env", e)
    logger.info("CampusCoPilot v2 started.")


@app.on_event("shutdown")
async def shutdown():
    await close_client()


# ══════════════════════════════════════════════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

class RegisterBody(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@app.post("/api/auth/register")
async def register(body: RegisterBody):
    existing = await find_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    user = await create_user(body.email, body.name, hash_password(body.password))
    token = create_access_token(user["_id"], body.email)
    return {"token": token, "user": {"id": user["_id"], "email": body.email, "name": body.name}}


@app.post("/api/auth/login")
async def login(body: LoginBody):
    user = await find_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    user_ser = serialize_doc(user)
    token = create_access_token(user_ser["_id"], body.email)
    return {"token": token, "user": {"id": user_ser["_id"], "email": user_ser["email"], "name": user_ser["name"]}}


@app.get("/api/auth/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": user["_id"], "email": user["email"], "name": user["name"]}


@app.post("/api/auth/avatar")
async def upload_avatar(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image.")
    file_bytes = await file.read()
    
    # Store in database
    from backend.db import store_avatar
    await store_avatar(user_id, file_bytes, file.content_type)
    return {"status": "ok", "message": "Avatar updated"}


@app.get("/api/users/{target_id}/avatar")
async def fetch_avatar(target_id: str):
    from backend.db import get_avatar
    from fastapi.responses import Response
    avatar = await get_avatar(target_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found.")
    return Response(content=avatar["data"], media_type=avatar["content_type"])


# ══════════════════════════════════════════════════════════════════════
#  HEALTH
# ══════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "token_usage": get_token_usage()}


# ══════════════════════════════════════════════════════════════════════
#  SESSIONS (list / get / delete saved roadmaps)
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    sessions = await get_user_sessions(user_id)
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
async def get_session_detail(session_id: str, user_id: str = Depends(get_current_user_id)):
    session = await get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"session": session}


@app.delete("/api/sessions/{session_id}")
async def delete_session_endpoint(session_id: str, user_id: str = Depends(get_current_user_id)):
    deleted = await delete_session(session_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════════════
#  1. UPLOAD SYLLABUS
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/upload-syllabus")
async def upload_syllabus(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    ext = file.filename.lower()
    if not (ext.endswith(".pdf") or ext.endswith(".png") or ext.endswith(".jpg") or ext.endswith(".jpeg")):
        raise HTTPException(status_code=400, detail="Please upload a PDF, PNG, or JPG file.")

    file_bytes = await file.read()
    
    is_image = not ext.endswith(".pdf")

    # Store file in MongoDB GridFS (both images and PDFs can be stored as binary)

    # PDF Upload Flow
    # Store PDF in MongoDB GridFS
    file_id = await store_pdf(file.filename, file_bytes, user_id)
    logger.info("Stored PDF in GridFS: %s (file_id=%s)", file.filename, file_id)

    # Write to temp file for extraction
    suffix = ".pdf" if not is_image else ext
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = await process_syllabus(tmp_path, is_image=is_image)
    except Exception as e:
        logger.exception("Failed to process syllabus")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    # Create a session in MongoDB
    session = await create_session(
        user_id=user_id,
        filename=file.filename,
        topics=result["topics"],
        raw_text_preview=result["raw_text_preview"],
        total_pages=result["total_pages"],
        syllabus_file_id=file_id,
    )

    return JSONResponse(content={
        "session_id": session["_id"],
        "filename": file.filename,
        "total_pages": result["total_pages"],
        "topics": result["topics"],
        "raw_text_preview": result["raw_text_preview"],
        "token_usage": get_token_usage(),
    })


# ══════════════════════════════════════════════════════════════════════
#  2. GENERATE CAMPAIGN
# ══════════════════════════════════════════════════════════════════════

class GenerateCampaignBody(BaseModel):
    session_id: str
    constraints: Optional[StudentConstraints] = None


@app.post("/api/generate-campaign")
async def api_generate_campaign(body: GenerateCampaignBody, user_id: str = Depends(get_current_user_id)):
    session = await get_session(body.session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    topics = session.get("topics")
    if not topics:
        raise HTTPException(status_code=400, detail="No topics in this session.")

    constraints_dict = body.constraints.model_dump() if body.constraints else {}

    try:
        campaign = await generate_campaign(topics, constraints_dict)
    except Exception as e:
        logger.exception("Failed to generate campaign")
        raise HTTPException(status_code=500, detail=str(e))

    # Unwrap stringified JSON
    for _ in range(5):
        if isinstance(campaign, str):
            try:
                campaign = json.loads(campaign)
            except (ValueError, TypeError):
                # Try repairing truncated JSON
                from backend.services.llama_client import repair_truncated_json
                repaired = repair_truncated_json(campaign)
                if repaired:
                    campaign = json.loads(repaired)
                else:
                    break
        else:
            break

    # Unwrap wrapper keys
    if isinstance(campaign, dict) and "weekly_plans" not in campaign:
        for key in ("campaign", "study_campaign", "plan", "data"):
            val = campaign.get(key)
            if isinstance(val, str):
                try:
                    val = json.loads(val)
                except (ValueError, TypeError):
                    pass
            if isinstance(val, dict) and "weekly_plans" in val:
                campaign = val
                break

    await update_session_campaign(body.session_id, user_id, campaign)
    return JSONResponse(content={"campaign": campaign, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  3. MOCK DISRUPTION & REPLAN
# ══════════════════════════════════════════════════════════════════════

class MockDisruptionBody(BaseModel):
    session_id: str
    disruption: DisruptionEvent


@app.post("/api/mock-disruption")
async def mock_disruption(body: MockDisruptionBody, user_id: str = Depends(get_current_user_id)):
    session = await get_session(body.session_id, user_id)
    is_semester = False
    if not session:
        session = await get_semester_plan(body.session_id, user_id)
        is_semester = True

    if not session:
        raise HTTPException(status_code=404, detail="Session or Plan not found.")

    campaign = session.get("campaign")
    if not campaign:
        raise HTTPException(status_code=400, detail="Generate a campaign first.")

    try:
        updated = await replan_campaign(campaign=campaign, disruption=body.disruption.model_dump())
    except Exception as e:
        logger.exception("Replan failed")
        raise HTTPException(status_code=500, detail=str(e))

    if is_semester:
        await update_semester_campaign(body.session_id, user_id, updated)
    else:
        await update_session_campaign(body.session_id, user_id, updated)
        
    return JSONResponse(content={"campaign": updated, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  4. EVENT SCHEDULER
# ══════════════════════════════════════════════════════════════════════

class ScheduleBody(BaseModel):
    session_id: str
    payload: SchedulerInput


@app.post("/api/schedule")
async def api_schedule(body: ScheduleBody, user_id: str = Depends(get_current_user_id)):
    events_dicts = [e.model_dump() for e in body.payload.events]
    try:
        result = await build_schedule(
            events=events_dicts,
            hours_per_day=body.payload.available_hours_per_day,
            day_start=body.payload.day_start_time,
            day_end=body.payload.day_end_time,
            break_minutes=body.payload.preferred_break_minutes,
        )
    except Exception as e:
        logger.exception("Scheduler failed")
        raise HTTPException(status_code=500, detail=str(e))

    await update_session_schedule(body.session_id, user_id, result)
    return JSONResponse(content={"schedule": result, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  SEMESTER PLANNER – Multi-subject support
# ══════════════════════════════════════════════════════════════════════

class CreateSemesterPlanBody(BaseModel):
    semester_info: SemesterInfo


@app.post("/api/semester-plan")
async def api_create_semester_plan(body: CreateSemesterPlanBody, user_id: str = Depends(get_current_user_id)):
    plan = await create_semester_plan(user_id, body.semester_info.model_dump())
    return {"plan": plan}


@app.get("/api/semester-plans")
async def api_list_semester_plans(user_id: str = Depends(get_current_user_id)):
    plans = await get_user_semester_plans(user_id)
    return {"plans": plans}


@app.get("/api/semester-plan/{plan_id}")
async def api_get_semester_plan(plan_id: str, user_id: str = Depends(get_current_user_id)):
    plan = await get_semester_plan(plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Semester plan not found.")
    return {"plan": plan}


@app.delete("/api/semester-plan/{plan_id}")
async def api_delete_semester_plan(plan_id: str, user_id: str = Depends(get_current_user_id)):
    deleted = await delete_semester_plan(plan_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Semester plan not found.")
    return {"deleted": True}


class AddSubjectBody(BaseModel):
    name: str
    credits: Optional[int] = None
    topics: List[Dict[str, Any]] = Field(default_factory=list)
    weak: bool = False
    strength: str = "Okay"
    interest: str = "Okay"


@app.post("/api/semester-plan/{plan_id}/add-subject")
async def api_add_subject(plan_id: str, body: AddSubjectBody, user_id: str = Depends(get_current_user_id)):
    plan = await get_semester_plan(plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Semester plan not found.")

    subjects = plan.get("subjects", [])
    subjects.append({
        "name": body.name,
        "credits": body.credits,
        "topics": body.topics,
        "pdf_uploaded": False,
        "weak": body.weak,
        "strength": body.strength,
        "interest": body.interest,
    })
    await update_semester_subjects(plan_id, user_id, subjects)
    return {"subjects": subjects}


@app.post("/api/semester-plan/{plan_id}/upload-subject")
async def api_upload_subject_pdf(
    plan_id: str,
    subject_name: str = "",
    credits: int = 0,
    weak: str = "false",
    strength: str = "Okay",
    interest: str = "Okay",
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Upload a PDF for a specific subject, extract topics, and add to semester plan."""
    plan = await get_semester_plan(plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Semester plan not found.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    file_bytes = await file.read()
    await store_pdf(file.filename, file_bytes, user_id)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = await process_syllabus(tmp_path)
    except Exception as e:
        logger.exception("Failed to process subject PDF")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    subjects = plan.get("subjects", [])
    subjects.append({
        "name": subject_name or file.filename.replace(".pdf", ""),
        "credits": credits,
        "topics": result["topics"],
        "pdf_uploaded": True,
        "weak": weak.lower() == "true",
        "strength": strength,
        "interest": interest,
    })
    await update_semester_subjects(plan_id, user_id, subjects)
    return {
        "subject_name": subject_name or file.filename.replace(".pdf", ""),
        "topics": result["topics"],
        "total_pages": result["total_pages"],
        "subjects": subjects,
    }


class UpdateSubjectsBody(BaseModel):
    subjects: List[Dict[str, Any]]


@app.put("/api/semester-plan/{plan_id}/subjects")
async def api_update_subjects(plan_id: str, body: UpdateSubjectsBody, user_id: str = Depends(get_current_user_id)):
    plan = await get_semester_plan(plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Semester plan not found.")
    await update_semester_subjects(plan_id, user_id, body.subjects)
    return {"subjects": body.subjects}


class GenerateSemesterCampaignBody(BaseModel):
    constraints: Optional[SemesterPlanConstraints] = None


@app.post("/api/semester-plan/{plan_id}/generate-campaign")
async def api_generate_semester_campaign(
    plan_id: str,
    body: GenerateSemesterCampaignBody,
    user_id: str = Depends(get_current_user_id),
):
    plan = await get_semester_plan(plan_id, user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Semester plan not found.")

    subjects = plan.get("subjects", [])
    if not subjects:
        raise HTTPException(status_code=400, detail="Add at least one subject first.")

    semester_info = {
        "university": plan.get("university", ""),
        "branch": plan.get("branch", ""),
        "semester_type": plan.get("semester_type", "autumn"),
        "semester_number": plan.get("semester_number", ""),
        "semester_start": plan.get("semester_start"),
        "midterm_start": plan.get("midterm_start"),
        "midterm_end": plan.get("midterm_end"),
        "endterm_start": plan.get("endterm_start"),
        "endterm_end": plan.get("endterm_end"),
    }

    constraints_dict = body.constraints.model_dump() if body.constraints else {}

    try:
        campaign = await generate_semester_campaign(subjects, semester_info, constraints_dict)
    except Exception as e:
        logger.exception("Failed to generate semester campaign")
        raise HTTPException(status_code=500, detail=str(e))

    # Unwrap stringified JSON
    for _ in range(5):
        if isinstance(campaign, str):
            try:
                campaign = json.loads(campaign)
            except (ValueError, TypeError):
                from backend.services.llama_client import repair_truncated_json
                repaired = repair_truncated_json(campaign)
                if repaired:
                    campaign = json.loads(repaired)
                else:
                    break
        else:
            break

    # Unwrap wrapper keys
    if isinstance(campaign, dict) and "weekly_plans" not in campaign:
        for key in ("campaign", "study_campaign", "plan", "data"):
            val = campaign.get(key)
            if isinstance(val, str):
                try:
                    val = json.loads(val)
                except (ValueError, TypeError):
                    pass
            if isinstance(val, dict) and "weekly_plans" in val:
                campaign = val
                break

    await update_semester_campaign(plan_id, user_id, campaign)
    return JSONResponse(content={"campaign": campaign, "token_usage": get_token_usage()})


# ── Study Groups (by university / branch) ────────────────────────────

class StudyGroupSearchBody(BaseModel):
    university: str = ""
    branch: str = ""


@app.post("/api/study-groups/search")
async def api_search_study_groups(body: StudyGroupSearchBody, user_id: str = Depends(get_current_user_id)):
    if not body.university and not body.branch:
        raise HTTPException(status_code=400, detail="Provide university or branch to search.")
    groups = await find_study_groups(body.university, body.branch)
    # Group by university+branch
    grouped: Dict[str, Any] = {}
    for g in groups:
        key = f"{g.get('university', 'Unknown')} – {g.get('branch', 'Unknown')}"
        if key not in grouped:
            grouped[key] = {"university": g.get("university", ""), "branch": g.get("branch", ""), "members": [], "subjects": set()}
        user = await find_user_by_id(str(g.get("user_id", "")))
        if user:
            grouped[key]["members"].append({"name": user.get("name", ""), "email": user.get("email", "")})
        for s in g.get("subjects", []):
            if isinstance(s, dict) and s.get("name"):
                grouped[key]["subjects"].add(s["name"])
    # Convert sets to lists for JSON serialization
    result = []
    for key, val in grouped.items():
        val["subjects"] = list(val["subjects"])
        val["group_name"] = key
        result.append(val)
    return {"groups": result}


# ══════════════════════════════════════════════════════════════════════
#  5. RETRIEVER – Resource packs for topics
# ══════════════════════════════════════════════════════════════════════

class RetrieveResourcesBody(BaseModel):
    topic: str
    subtopics: List[str] = Field(default_factory=list)
    language: str = "English"


class RetrieveForCampaignBody(BaseModel):
    session_id: str
    language: str = "English"
    max_topics: int = Field(10, ge=1, le=30)


@app.post("/api/resources")
async def api_retrieve_resources(body: RetrieveResourcesBody, user_id: str = Depends(get_current_user_id)):
    try:
        result = await retrieve_resources(body.topic, body.subtopics, body.language)
    except Exception as e:
        logger.exception("Retriever failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"resources": result, "token_usage": get_token_usage()})


@app.post("/api/resources/campaign")
async def api_retrieve_for_campaign(body: RetrieveForCampaignBody, user_id: str = Depends(get_current_user_id)):
    session = await get_session(body.session_id, user_id)
    if not session or not session.get("campaign"):
        raise HTTPException(status_code=404, detail="Session with campaign not found.")
    try:
        resources = await retrieve_for_campaign(session["campaign"], body.language, body.max_topics)
    except Exception as e:
        logger.exception("Campaign retriever failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"resources": resources, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  6. MICRO-TUTOR – Quizzes & Flashcards
# ══════════════════════════════════════════════════════════════════════

from backend.agents.micro_tutor import generate_quiz, generate_flashcards, generate_resume_bullets
from backend.services.pdf_parser import scan_document


class AutoSetupBody(BaseModel):
    university: str
    branch: str
    semester: str
    semester_start: str = ""
    semester_end: str = ""
    language_preference: str = "English"
    study_style: str = "balanced"
    available_hours_per_day: float = 4.0

@app.post("/api/onboarding/auto-setup")
async def api_auto_setup(body: AutoSetupBody, user_id: str = Depends(get_current_user_id)):
    """Automatically generates a semester syllabus and campaign based on profile input."""
    # 1. Hallucinate the subjects
    subjects = await synthesize_college_syllabus(body.university, body.branch, body.semester)

    # 2. Create the Semester Plan in DB
    semester_info = {
        "university": body.university,
        "branch": body.branch,
        "semester_type": "autumn" if "odd" in body.semester.lower() or "1" in body.semester else "spring",
        "semester_number": body.semester,
        "semester_start": body.semester_start,
        "endterm_end": body.semester_end,
    }
    plan = await create_semester_plan(user_id, semester_info)
    plan_id = plan["_id"]

    # 3. Add those subjects to the plan
    updated_plan = await update_semester_subjects(user_id, plan_id, subjects)

    # 4. Generate the Campaign
    constraints = {
        "name": "Student",
        "available_hours_per_day": body.available_hours_per_day,
        "language_preference": body.language_preference,
        "study_style": body.study_style,
    }
    campaign_result = await generate_semester_campaign(updated_plan, constraints)

    # 5. Save the campaign to DB
    await update_semester_campaign(user_id, plan_id, campaign_result)
    
    return JSONResponse(content={"message": "Setup complete", "plan_id": plan_id})


@app.post("/api/scan-notes")
async def api_scan_notes(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")
    
    file_bytes = await file.read()
    ext = Path(file.filename).suffix.lower()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        text = scan_document(tmp_path)
    except Exception as e:
        logger.exception("Failed to scan notes")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return JSONResponse(content={"text": text})


class QuizBody(BaseModel):
    topic: str
    difficulty: str = "medium"
    num_questions: int = Field(5, ge=1, le=20)
    language: str = "English"


class FlashcardBody(BaseModel):
    topic: str
    count: int = Field(10, ge=1, le=30)
    language: str = "English"


class SaveQuizResultBody(BaseModel):
    topic: str
    score: int
    total: int
    answers: List[dict] = Field(default_factory=list)


@app.post("/api/quiz/generate")
async def api_generate_quiz(body: QuizBody, user_id: str = Depends(get_current_user_id)):
    try:
        result = await generate_quiz(body.topic, body.difficulty, body.num_questions, body.language)
    except Exception as e:
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"quiz": result, "token_usage": get_token_usage()})


@app.post("/api/flashcards/generate")
async def api_generate_flashcards(body: FlashcardBody, user_id: str = Depends(get_current_user_id)):
    try:
        result = await generate_flashcards(body.topic, body.count, body.language)
    except Exception as e:
        logger.exception("Flashcard generation failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"flashcards": result, "token_usage": get_token_usage()})


@app.post("/api/quiz/result")
async def api_save_quiz_result(body: SaveQuizResultBody, user_id: str = Depends(get_current_user_id)):
    result = await save_quiz_result(user_id, body.model_dump())
    return {"saved": True, "result": result}


@app.get("/api/quiz/history")
async def api_quiz_history(user_id: str = Depends(get_current_user_id)):
    results = await get_quiz_results(user_id)
    return {"results": results}


# ══════════════════════════════════════════════════════════════════════
#  7. FOCUS SESSIONS & POMODORO
# ══════════════════════════════════════════════════════════════════════

class FocusSessionBody(BaseModel):
    task: str
    duration_minutes: int = Field(25, ge=5, le=120)
    difficulty: str = "medium"
    language: str = "English"


class LogPomodoroBody(BaseModel):
    task: str
    duration_minutes: int = Field(25, ge=1, le=120)
    completed: bool = True
    started_at: Optional[str] = None


@app.post("/api/focus-session")
async def api_focus_session(body: FocusSessionBody, user_id: str = Depends(get_current_user_id)):
    try:
        result = await generate_focus_session(body.task, body.duration_minutes, body.difficulty, body.language)
    except Exception as e:
        logger.exception("Focus session generation failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"session": result, "token_usage": get_token_usage()})


@app.post("/api/pomodoro/log")
async def api_log_pomodoro(body: LogPomodoroBody, user_id: str = Depends(get_current_user_id)):
    result = await log_pomodoro(user_id, body.model_dump())
    return {"saved": True, "pomodoro": result}


@app.get("/api/pomodoro/count")
async def api_pomodoro_count(user_id: str = Depends(get_current_user_id)):
    count = await get_pomodoro_count(user_id)
    return {"count": count}


# ══════════════════════════════════════════════════════════════════════
#  8. TASK COMPLETION TRACKING
# ══════════════════════════════════════════════════════════════════════

class LogTaskBody(BaseModel):
    session_id: str = ""
    task: str
    topic: str = ""
    duration_minutes: int = 0


@app.post("/api/tasks/complete")
async def api_complete_task(body: LogTaskBody, user_id: str = Depends(get_current_user_id)):
    result = await log_task_completion(user_id, body.session_id, body.model_dump())
    return {"saved": True, "completion": result}


@app.get("/api/tasks/history")
async def api_task_history(user_id: str = Depends(get_current_user_id)):
    completions = await get_user_completions(user_id)
    return {"completions": completions}


# ══════════════════════════════════════════════════════════════════════
#  9. WELL-BEING & NUDGES
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/wellbeing/nudge")
async def api_wellbeing_nudge(user_id: str = Depends(get_current_user_id)):
    completions = await get_user_completions(user_id, limit=50)
    recent_activity = {
        "completions": completions[:20],
        "total_recent": len(completions),
    }
    try:
        nudge = await generate_wellbeing_nudge(recent_activity)
    except Exception as e:
        logger.exception("Wellbeing nudge failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"nudge": nudge, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  10. STREAKS & BADGES (Gamification)
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/gamification")
async def api_gamification(user_id: str = Depends(get_current_user_id)):
    metrics = await get_user_metrics(user_id)
    streak = calculate_streak(metrics.get("completion_dates", []))
    metrics["current_streak"] = streak["current_streak"]
    metrics["longest_streak"] = streak["longest_streak"]
    badges = check_badges(metrics)
    return {
        "streak": streak,
        "badges": badges,
        "metrics": metrics,
    }


# ══════════════════════════════════════════════════════════════════════
#  11. PROFILE & GOALS
# ══════════════════════════════════════════════════════════════════════

class ProfileBody(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    semester: Optional[int] = None
    cgpa_target: Optional[float] = None
    target_companies: List[str] = Field(default_factory=list)
    study_style: Optional[str] = None  # visual, auditory, reading, kinesthetic
    daily_goal_hours: Optional[float] = None
    language_preference: str = "English"


@app.get("/api/profile")
async def api_get_profile(user_id: str = Depends(get_current_user_id)):
    profile = await get_profile(user_id)
    return {"profile": profile}


@app.put("/api/profile")
async def api_update_profile(body: ProfileBody, user_id: str = Depends(get_current_user_id)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    profile = await upsert_profile(user_id, data)
    return {"profile": profile}


# ══════════════════════════════════════════════════════════════════════
#  12. CAREER & PORTFOLIO
# ══════════════════════════════════════════════════════════════════════

class PortfolioEntryBody(BaseModel):
    title: str
    description: str = ""
    skills: List[str] = Field(default_factory=list)
    category: str = "project"
    date: Optional[str] = None


@app.get("/api/portfolio")
async def api_get_portfolio(user_id: str = Depends(get_current_user_id)):
    entries = await get_portfolio(user_id)
    return {"entries": entries}


@app.post("/api/portfolio")
async def api_add_portfolio(body: PortfolioEntryBody, user_id: str = Depends(get_current_user_id)):
    entry = await add_portfolio_entry(user_id, body.model_dump())
    return {"entry": entry}


@app.delete("/api/portfolio/{entry_id}")
async def api_delete_portfolio(entry_id: str, user_id: str = Depends(get_current_user_id)):
    deleted = await delete_portfolio_entry(user_id, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return {"deleted": True}


@app.post("/api/portfolio/resume-bullets")
async def api_resume_bullets(user_id: str = Depends(get_current_user_id)):
    profile = await get_profile(user_id) or {}
    portfolio = await get_portfolio(user_id)
    language = profile.get("language_preference", "English")
    try:
        result = await generate_resume_bullets(profile, portfolio, language)
    except Exception as e:
        logger.exception("Resume bullet generation failed")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"bullets": result, "token_usage": get_token_usage()})


# ══════════════════════════════════════════════════════════════════════
#  13. STUDY SQUADS
# ══════════════════════════════════════════════════════════════════════

import secrets


class CreateSquadBody(BaseModel):
    name: str
    topic: str = ""
    max_members: int = Field(5, ge=2, le=20)


class JoinSquadBody(BaseModel):
    invite_code: str


@app.post("/api/squads")
async def api_create_squad(body: CreateSquadBody, user_id: str = Depends(get_current_user_id)):
    data = body.model_dump()
    data["invite_code"] = secrets.token_urlsafe(8)
    squad = await create_squad(user_id, data)
    return {"squad": squad}


@app.get("/api/squads")
async def api_list_squads(user_id: str = Depends(get_current_user_id)):
    squads = await get_user_squads(user_id)
    return {"squads": squads}


@app.post("/api/squads/join")
async def api_join_squad(body: JoinSquadBody, user_id: str = Depends(get_current_user_id)):
    squad = await join_squad(user_id, body.invite_code)
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found or full.")
    return {"squad": squad}


@app.post("/api/squads/{squad_id}/leave")
async def api_leave_squad(squad_id: str, user_id: str = Depends(get_current_user_id)):
    left = await leave_squad(user_id, squad_id)
    if not left:
        raise HTTPException(status_code=404, detail="Squad not found.")
    return {"left": True}


# ══════════════════════════════════════════════════════════════════════
#  14. ANALYTICS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/analytics")
async def api_analytics(user_id: str = Depends(get_current_user_id)):
    metrics = await get_user_metrics(user_id)
    streak = calculate_streak(metrics.get("completion_dates", []))
    quiz_results = await get_quiz_results(user_id, limit=20)

    # Topic-wise performance from quiz results
    topic_scores: Dict[str, list] = {}
    for q in quiz_results:
        t = q.get("topic", "Unknown")
        if q.get("total", 0) > 0:
            topic_scores.setdefault(t, []).append(q["score"] / q["total"] * 100)

    topic_performance = [
        {"topic": t, "average_score": round(sum(scores) / len(scores), 1), "attempts": len(scores)}
        for t, scores in topic_scores.items()
    ]

    return {
        "metrics": metrics,
        "streak": streak,
        "topic_performance": topic_performance,
        "recent_quizzes": quiz_results[:10],
    }


# ── Entry point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
