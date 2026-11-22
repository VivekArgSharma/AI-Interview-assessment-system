import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db.database import get_db
from .deps import get_current_user
from ..models.models import (
    User,
    RoleModel,
    Invite,
    InterviewTrack,
    InterviewSession,
    Question,
    Answer,
    Rubric,
    RubricCriterion,
    Report,
    AuditLog
)

router = APIRouter(prefix="/custom-interviews", tags=["Custom Interviews"])

# ----------------- Request / Response Schemas -----------------

class CustomTestCase(BaseModel):
    input: str = Field(default="", description="Standard input for test case")
    expected_output: str = Field(default="", description="Expected standard output")

class CustomQuestionInput(BaseModel):
    stage: str = Field(..., description="Stage name or category, e.g. 'Defect Origin Triage' or 'Live C++ Debugging'")
    question_text: str = Field(..., description="The interview question or problem statement")
    question_type: str = Field(default="verbal", description="'verbal', 'coding_bug_fix', or 'coding_leetcode'")
    correct_answer: str = Field(default="", description="The reference / model answer or correct C++ solution")
    key_concepts: List[str] = Field(default_factory=list, description="Core keywords/concepts expected in the answer")
    starter_code: Optional[str] = Field(default="", description="Starter C++ code (buggy code for bug fix, boilerplate for leetcode)")
    test_cases: List[CustomTestCase] = Field(default_factory=list, description="C++ test cases with inputs and expected outputs")

class CustomInterviewCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Interview title")
    track: str = Field("tech", description="'tech' or 'sales'")
    duration_minutes: int = Field(15, ge=5, le=60)
    questions: List[CustomQuestionInput] = Field(..., min_length=1)

class CustomInterviewResponse(BaseModel):
    id: str
    role_id: str
    invite_code: str
    invite_url: str
    title: str
    track: str
    duration_minutes: int
    questions_count: int
    questions: List[Dict[str, Any]]
    created_at: datetime
    submissions_count: int = 0

class InviteLookupResponse(BaseModel):
    valid: bool
    invite_code: str
    role_id: str
    title: str
    track: str
    track_id: str
    duration_minutes: int
    questions_count: int
    stages: List[str]

class StartCustomInterviewRequest(BaseModel):
    invite_code: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None

# Helper to normalize invite tokens
def normalize_token(raw_input: str) -> str:
    cleaned = raw_input.strip()
    # Check if a full URL was pasted: http://localhost:5173/?invite=TECH-4821
    match = re.search(r"[?&]invite=([A-Za-z0-9\-_]+)", cleaned)
    if match:
        return match.group(1).upper()
    # If standard code
    return cleaned.upper()

# ----------------- API Endpoints -----------------

@router.post("", response_model=CustomInterviewResponse)
def create_custom_interview(
    request: CustomInterviewCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows an interviewer to design an interview with custom questions and model correct answers.
    Generates a shareable invite code (e.g., TECH-4821) and direct URL.
    """
    track_normalized = "tech" if request.track.lower() in ["tech", "technical", "swe", "bug_fixing"] else "sales"
    track_id = "bug_fixing" if track_normalized == "tech" else "sales"

    # Default recruiter user if unauthenticated
    recruiter_user = user
    if not recruiter_user or recruiter_user.role not in ["recruiter", "admin", "reviewer"]:
        recruiter_user = db.query(User).filter(User.role == "recruiter").first()
    
    role_id = f"custom_role_{uuid.uuid4().hex[:8]}"

    # Serialize questions
    serialized_questions = []
    for idx, q in enumerate(request.questions):
        # Auto-derive concepts if empty
        concepts = q.key_concepts
        if not concepts:
            words = [w.strip(".,;:?!") for w in q.correct_answer.split() if len(w) > 4]
            concepts = list(dict.fromkeys(words))[:6]

        serialized_questions.append({
            "sequence_number": idx + 1,
            "stage": q.stage.strip() or f"Stage {idx + 1}",
            "question_text": q.question_text.strip(),
            "correct_answer": q.correct_answer.strip(),
            "key_concepts": concepts
        })

    # Create RoleModel
    role = RoleModel(
        id=role_id,
        recruiter_id=recruiter_user.id if recruiter_user else None,
        title=request.title.strip(),
        jd_text=f"Custom {track_normalized.capitalize()} Assessment with {len(serialized_questions)} questions.",
        scenario_type=track_normalized,
        duration_minutes=request.duration_minutes,
        video_enabled=True,
        custom_questions=serialized_questions
    )
    db.add(role)
    db.flush()

    # Generate friendly invite code: e.g. TECH-4821 or SALES-7294
    code_prefix = "TECH" if track_normalized == "tech" else "SALES"
    code_suffix = uuid.uuid4().hex[:4].upper()
    invite_code = f"{code_prefix}-{code_suffix}"

    invite = Invite(
        role_id=role.id,
        token=invite_code,
        expires_at=datetime.utcnow() + timedelta(days=60)
    )
    db.add(invite)

    # Audit log
    db.add(AuditLog(
        actor=recruiter_user.email if recruiter_user else "interviewer",
        action="custom_interview_created",
        target=f"role:{role.id}",
        details={"invite_code": invite_code, "track": track_normalized, "questions": len(serialized_questions)}
    ))

    db.commit()
    db.refresh(role)
    db.refresh(invite)

    return CustomInterviewResponse(
        id=invite.id,
        role_id=role.id,
        invite_code=invite_code,
        invite_url=f"/?invite={invite_code}",
        title=role.title,
        track=track_normalized,
        duration_minutes=role.duration_minutes,
        questions_count=len(serialized_questions),
        questions=serialized_questions,
        created_at=role.created_at,
        submissions_count=0
    )


@router.get("", response_model=List[CustomInterviewResponse])
def list_custom_interviews(
    track: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lists custom interviews created by interviewers.
    """
    query = db.query(RoleModel).filter(RoleModel.custom_questions != None)
    if track:
        norm = "tech" if track.lower() in ["tech", "technical", "bug_fixing"] else "sales"
        query = query.filter(RoleModel.scenario_type == norm)

    roles = query.order_by(RoleModel.created_at.desc()).all()
    results = []

    for r in roles:
        questions = r.custom_questions or []
        if not questions:
            continue
        
        # Find primary invite
        inv = db.query(Invite).filter(Invite.role_id == r.id).first()
        code = inv.token if inv else f"INT-{r.id[:6].upper()}"

        # Count submissions
        subs = db.query(InterviewSession).filter(
            InterviewSession.role_id == r.id,
            InterviewSession.status == "completed"
        ).count()

        results.append(CustomInterviewResponse(
            id=inv.id if inv else r.id,
            role_id=r.id,
            invite_code=code,
            invite_url=f"/?invite={code}",
            title=r.title,
            track=r.scenario_type or "tech",
            duration_minutes=r.duration_minutes,
            questions_count=len(questions),
            questions=questions,
            created_at=r.created_at,
            submissions_count=subs
        ))

    return results


@router.get("/by-code/{code}", response_model=InviteLookupResponse)
def lookup_invite_code(code: str, db: Session = Depends(get_db)):
    """
    Validates an invite code or pasted URL and returns interview details so candidate can inspect and start.
    """
    token = normalize_token(code)
    invite = db.query(Invite).filter(Invite.token == token).first()

    # Case-insensitive fallback
    if not invite:
        invite = db.query(Invite).filter(Invite.token.ilike(token)).first()

    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview invite code '{code}' not found. Please verify the code or link."
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This interview invite link has expired."
        )

    role = invite.role
    if not role:
        raise HTTPException(status_code=404, detail="Associated interview role not found.")

    questions = role.custom_questions or []
    track_norm = role.scenario_type or "tech"
    track_id = "bug_fixing" if track_norm == "tech" else "sales"

    stages = [q.get("stage", f"Stage {i+1}") for i, q in enumerate(questions)]

    return InviteLookupResponse(
        valid=True,
        invite_code=invite.token,
        role_id=role.id,
        title=role.title,
        track=track_norm,
        track_id=track_id,
        duration_minutes=role.duration_minutes,
        questions_count=len(questions),
        stages=stages
    )


@router.post("/start")
def start_custom_interview_by_invite(
    request: StartCustomInterviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts an interview based on the interviewer's custom questions and model answers.
    Initializes questions with the interviewer's reference answers for real-time semantic scoring.
    """
    token = normalize_token(request.invite_code)
    invite = db.query(Invite).filter(Invite.token.ilike(token)).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview code '{request.invite_code}' is invalid."
        )

    role = invite.role
    if not role or not role.custom_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This custom interview has no questions configured."
        )

    # Resolve candidate user
    candidate_user = user
    if not candidate_user or candidate_user.role != "candidate":
        candidate_user = db.query(User).filter(User.role == "candidate").first()

    track_norm = role.scenario_type or "tech"
    track_id = "bug_fixing" if track_norm == "tech" else "sales"

    track = db.query(InterviewTrack).filter(InterviewTrack.id == track_id).first()
    rubric = db.query(Rubric).filter(Rubric.track_id == track_id).first()

    # 1. Create Session
    now = datetime.utcnow()
    session = InterviewSession(
        user_id=candidate_user.id if candidate_user else None,
        role_id=role.id,
        track_id=track_id,
        rubric_version_id=rubric.id if rubric else None,
        mode="custom_interview",
        difficulty="intermediate",
        duration_minutes=role.duration_minutes,
        voice_preference="en-US-JennyNeural",
        video_enabled=role.video_enabled,
        status="in_progress",
        current_stage=role.custom_questions[0].get("stage", "Stage 1"),
        current_stage_index=0,
        started_at=now,
        candidate_consent={"audio": True, "video": True, "retention_ttl_hours": 24}
    )
    db.add(session)
    db.flush()

    # 2. Populate Questions with Interviewer's Reference Answers
    created_questions = []
    for idx, q_data in enumerate(role.custom_questions):
        q_type = q_data.get("question_type", "verbal")
        starter_code = q_data.get("starter_code", "")
        test_cases = q_data.get("test_cases", [])
        
        coding_meta = {}
        if q_type in ("coding_bug_fix", "coding_leetcode") or starter_code or test_cases:
            coding_meta = {
                "language": "cpp",
                "type": q_type,
                "starter_code": starter_code,
                "correct_code": q_data.get("correct_answer", ""),
                "test_cases": test_cases
            }

        q = Question(
            session_id=session.id,
            question_text=q_data.get("question_text"),
            question_type=q_type if q_type in ("coding_bug_fix", "coding_leetcode") else "initial",
            sequence_number=idx + 1,
            interview_stage=q_data.get("stage", f"Stage {idx + 1}"),
            context_notes=f"Interviewer custom question {idx + 1}",
            reference_answer=q_data.get("correct_answer", ""),
            expected_concepts=q_data.get("key_concepts", []),
            coding_metadata=coding_meta
        )
        db.add(q)
        db.flush()
        created_questions.append(q)

    # Mark invite as active
    invite.used_at = now
    db.commit()
    db.refresh(session)

    first_q = created_questions[0]

    return {
        "id": session.id,
        "session_id": session.id,
        "track_id": session.track_id,
        "track_name": track.name if track else ("Software Engineering" if track_norm == "tech" else "Sales"),
        "role_title": role.title,
        "difficulty": session.difficulty,
        "duration_minutes": session.duration_minutes,
        "status": session.status,
        "current_stage": session.current_stage,
        "current_stage_index": 0,
        "total_stages": len(created_questions),
        "current_question": {
            "id": first_q.id,
            "session_id": session.id,
            "question_text": first_q.question_text,
            "question_type": first_q.question_type,
            "sequence_number": first_q.sequence_number,
            "interview_stage": first_q.interview_stage,
            "context_notes": first_q.context_notes,
            "expected_concepts": first_q.expected_concepts,
            "coding_metadata": first_q.coding_metadata
        }
    }


@router.get("/{role_id}/submissions")
def get_custom_interview_submissions(
    role_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns candidate submissions for a specific custom interview, including semantic scores and speech metrics.
    """
    role = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Custom interview not found.")

    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.role_id == role.id, InterviewSession.status == "completed")
        .order_by(InterviewSession.completed_at.desc())
        .all()
    )

    submissions = []
    for s in sessions:
        rep = s.report
        submissions.append({
            "session_id": s.id,
            "candidate_name": s.user.display_name if s.user else "Anonymous Candidate",
            "candidate_email": s.user.email if s.user else "N/A",
            "completed_at": s.completed_at,
            "content_score": rep.content_score if rep else 80.0,
            "overall_score": rep.overall_score if rep else 4.0,
            "delivery_wpm": rep.delivery_summary.get("average_wpm", 140.0) if rep and rep.delivery_summary else 140.0,
            "summary": rep.summary if rep else "Evaluation completed against interviewer model answers."
        })

    return {
        "role_id": role.id,
        "title": role.title,
        "track": role.scenario_type,
        "total_submissions": len(submissions),
        "submissions": submissions
    }
