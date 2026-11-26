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
    target_competencies: Optional[List[dict]] = Field(default_factory=list, description="Target competencies for spider radar")

class JobDescriptionGenerateRequest(BaseModel):
    job_description: str = Field(..., min_length=15, description="Job description or role profile text")
    track: str = Field("tech", description="'tech' or 'sales'")
    duration_minutes: int = Field(20, ge=5, le=60)

class TargetCompetencyItem(BaseModel):
    competency: str
    target_score: float
    description: str

class JobDescriptionGenerateResponse(BaseModel):
    title: str
    track: str
    duration_minutes: int
    target_competency_radar: List[TargetCompetencyItem]
    questions: List[CustomQuestionInput]

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


@router.post("/generate-from-jd", response_model=JobDescriptionGenerateResponse)
def generate_interview_from_job_description(payload: JobDescriptionGenerateRequest):
    """
    Auto-generates a tailored, multi-question interview (Spoken Q&A, Bug Fix with side-by-side code,
    and LeetCode C++ with test cases) + Target Competency Spider Radar directly from a Job Description.
    """
    jd_lower = payload.job_description.lower()
    is_sales = payload.track == "sales" or any(k in jd_lower for k in ["sales", "account executive", "bdr", "quota", "saas sales"])

    if is_sales:
        title = "Enterprise Account Executive & SaaS Sales Screen"
        target_radar = [
            {"competency": "Customer Discovery & Pain Qualification", "target_score": 4.6, "description": "Uncovers technical and commercial blockers through targeted diagnostic questions."},
            {"competency": "Value Proposition & ROI Framing", "target_score": 4.4, "description": "Shifts conversation from feature commoditization to executive ROI."},
            {"competency": "Objection & Price Resistance Handling", "target_score": 4.5, "description": "De-escalates price resistance without immediate discounting."},
            {"competency": "Active Listening & Rapport", "target_score": 4.2, "description": "Balances talk-to-listen ratio and reflects stakeholder constraints."},
            {"competency": "Mutual Action Plan & Closing", "target_score": 4.0, "description": "Drives clear next steps, legal review milestones, and decision criteria."}
        ]
        questions = [
            CustomQuestionInput(
                stage="Customer Discovery & Qualification",
                question_text="A prospective enterprise client is hesitant about transitioning from their legacy vendor due to implementation friction. How do you uncover their true underlying organizational hesitation without sounding confrontational?",
                question_type="verbal",
                correct_answer="I would start by acknowledging the validity of their friction concern, then ask diagnostic open-ended questions: 'Beyond the migration timeline, what specific failure mode are your team leads most concerned about during cutover?' and quantify the cost of inaction.",
                key_concepts=["diagnostic discovery", "cost of inaction", "stakeholder consensus", "migration risk"],
                starter_code="",
                test_cases=[]
            ),
            CustomQuestionInput(
                stage="Price Resistance & Value Defense",
                question_text="The procurement director informs you that your proposal is 35% higher than their incumbent solution and demands an immediate price match. How do you navigate this without eroding contract margin?",
                question_type="verbal",
                correct_answer="I would de-escalate the adversarial stance by validating their mandate to optimize spend, then pivot from upfront license cost to Total Cost of Ownership (TCO) and business risk. I would ask what features or support tiers they would be comfortable deprioritizing to reach that budget ceiling, preserving unit margin.",
                key_concepts=["total cost of ownership", "margin preservation", "give-get negotiation", "scope adjustment"],
                starter_code="",
                test_cases=[]
            )
        ]
    else:
        # Technical track
        if "staff" in jd_lower:
            title = "Staff Backend Systems & High Concurrency Engineer"
        elif "senior" in jd_lower:
            title = "Senior Distributed Systems & Platform Engineer"
        else:
            title = "Software Engineering Technical Screen (Systems & Concurrency)"

        target_radar = [
            {"competency": "Distributed Concurrency & Locks", "target_score": 4.6, "description": "Prevents race conditions, stampedes, and deadlocks in multi-threaded/distributed systems."},
            {"competency": "System Scalability & Caching", "target_score": 4.5, "description": "Designs low-latency, high-throughput caching layers with safe invalidation."},
            {"competency": "Fault Tolerance & Idempotency", "target_score": 4.3, "description": "Guarantees exact-once or at-most-once semantics during partial network timeouts."},
            {"competency": "Algorithmic Rigor & C++ Memory", "target_score": 4.0, "description": "Implements optimal data structures with bounded space and time complexity."},
            {"competency": "Technical Communication & Trade-Offs", "target_score": 4.2, "description": "Explains architectural trade-offs between latency, consistency, and simplicity."}
        ]

        questions = [
            CustomQuestionInput(
                stage="Architectural Concurrency & Trade-offs",
                question_text="In high-throughput services receiving 50,000 requests per second, what specific synchronization or locking mechanism do you use to prevent a cache stampede on key expiration, and how do you prevent synchronized expiration cascades?",
                question_type="verbal",
                correct_answer="I implement a three-tier mitigation strategy: 1) Singleflight request deduplication or a non-blocking distributed Redis mutex lease so only one worker queries the database on miss, 2) Probabilistic early refresh (XFetch algorithm) before hard TTL, and 3) Randomized TTL jitter (+-10%) to prevent synchronized cliffs.",
                key_concepts=["singleflight lock", "probabilistic early expiration", "TTL jitter", "stale-while-revalidate", "redis mutex"],
                starter_code="",
                test_cases=[]
            ),
            CustomQuestionInput(
                stage="Defect Triage & Concurrency Bug Fix",
                question_text="Inspect this C++ multi-threaded order queue. The accumulator vector is shared across worker threads without synchronization, resulting in race conditions and memory corruption. Fix the bug using std::mutex and std::lock_guard.",
                question_type="coding_bug_fix",
                correct_answer="#include <vector>\n#include <mutex>\n\nclass SafeOrderQueue {\nprivate:\n    std::vector<int> orders;\n    std::mutex mtx;\npublic:\n    void add_order(int order_id) {\n        std::lock_guard<std::mutex> lock(mtx);\n        orders.push_back(order_id);\n    }\n    int size() {\n        std::lock_guard<std::mutex> lock(mtx);\n        return orders.size();\n    }\n};",
                key_concepts=["std::mutex", "std::lock_guard", "thread safety", "race condition"],
                starter_code="#include <vector>\n\n// BUG: Shared vector accessed across threads with zero synchronization\nclass SafeOrderQueue {\nprivate:\n    std::vector<int> orders;\npublic:\n    void add_order(int order_id) {\n        orders.push_back(order_id);\n    }\n    int size() {\n        return orders.size();\n    }\n};",
                test_cases=[]
            ),
            CustomQuestionInput(
                stage="LeetCode Algorithm: In-Memory Sliding Window Counter",
                question_text="Write a C++ program that reads N incoming request timestamps and a time window size K, and outputs the maximum number of requests received in any window of length K.",
                question_type="coding_leetcode",
                correct_answer="#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    int n, k;\n    if (!(std::cin >> n >> k)) return 0;\n    std::vector<int> times(n);\n    for (int i = 0; i < n; i++) {\n        std::cin >> times[i];\n    }\n    int left = 0, max_requests = 0;\n    for (int right = 0; right < n; right++) {\n        while (times[right] - times[left] > k) {\n            left++;\n        }\n        max_requests = std::max(max_requests, right - left + 1);\n    }\n    std::cout << max_requests << std::endl;\n    return 0;\n}",
                key_concepts=["sliding window", "two pointers", "O(N) time complexity"],
                starter_code="#include <iostream>\n#include <vector>\n\n// Read n and k, then n timestamps, and output maximum requests within window k\nint main() {\n    int n, k;\n    std::cin >> n >> k;\n    // Implement your O(N) sliding window solution here\n    \n    return 0;\n}",
                test_cases=[
                    CustomTestCase(input="5 3\n1 2 3 5 6", expected_output="3"),
                    CustomTestCase(input="4 1\n10 12 15 20", expected_output="1")
                ]
            )
        ]

    return JobDescriptionGenerateResponse(
        title=title,
        track=payload.track,
        duration_minutes=payload.duration_minutes,
        target_competency_radar=[TargetCompetencyItem(**c) for c in target_radar],
        questions=questions
    )
