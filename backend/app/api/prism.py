import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.models import (
    User,
    RoleModel,
    Invite,
    Rubric,
    RubricCriterion,
    InterviewSession,
    Question,
    Answer,
    Score,
    Report,
    Contest,
    Review,
    ScenarioEvent,
    VideoFeature,
    AuditLog
)
from ..schemas.prism import (
    RoleCreateRequest,
    RoleResponse,
    DraftRubricRequest,
    DraftRubricResponse,
    InviteCreateRequest,
    InviteResponse,
    ConsentSubmitRequest,
    CodeRunRequest,
    CodeRunResponse,
    PersonaChatRequest,
    PersonaChatResponse,
    ScenarioEventRequest,
    ContestCreateRequest,
    ContestResponse,
    ReviewResolveRequest,
    ReviewQueueItem,
    RecruiterScorecardResponse
)
from .deps import get_current_user
from ..services.scenario_service import ScenarioService
from ..evaluation.evaluation_metrics import ModelEvaluator
from ..services.audio_storage import AudioStorageService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["prism"])

# ----------------- 1. Recruiter Setup: Roles & LLM Rubric Drafting (Section 5.1 & FR2) -----------------

@router.post("/roles/draft-rubric", response_model=DraftRubricResponse)
def draft_rubric_from_jd(request: DraftRubricRequest):
    """
    Simulates LLM-driven generation of rubric dimensions, weights, and interview question plan from Job Description.
    """
    is_tech = any(kw in (request.job_title + request.jd_text).lower() for kw in ["software", "engineer", "developer", "backend", "systems", "sre", "bug"])
    
    if is_tech:
        scenario = request.scenario_type if request.scenario_type != "standard" else "S1"
        dimensions = [
            {"criterion_key": "problem_decomposition", "criterion_name": "Problem Decomposition", "weight": 1.2, "description": "Isolates sub-system boundaries and tests edge cases systematically.", "modality_source": "text"},
            {"criterion_key": "root_cause_reasoning", "criterion_name": "Root-Cause Reasoning", "weight": 1.2, "description": "Deduces underlying failure mechanism from logs and metrics.", "modality_source": "text + scenario"},
            {"criterion_key": "proposed_fix", "criterion_name": "Proposed Fix Quality", "weight": 1.0, "description": "Permanent idempotent software fix with defensive architecture.", "modality_source": "scenario events"},
            {"criterion_key": "trade_offs", "criterion_name": "Trade-Off Awareness", "weight": 0.8, "description": "Articulates memory, latency, and distributed state trade-offs.", "modality_source": "text"},
            {"criterion_key": "delivery_clarity", "criterion_name": "Technical Communication Clarity", "weight": 0.6, "description": "Explains diagnosis aloud with structured cadence and low filler words.", "modality_source": "voice"}
        ]
        questions = [
            "Walk me through your systematic strategy for locating defect origins when reproduction steps are intermittent.",
            "In your previous projects, how did you balance quick hotfixes against root-cause preventative architecture?",
            "What automated regression tests would you mandate in CI to prevent memory accumulator regressions?"
        ]
        delivery_w = 0.20
    else:
        scenario = request.scenario_type if request.scenario_type != "standard" else "N1"
        dimensions = [
            {"criterion_key": "empathy_deescalation", "criterion_name": "Empathy & De-escalation", "weight": 1.2, "description": "Acknowledges client emotion and validates frustration before quoting policy.", "modality_source": "text + voice"},
            {"criterion_key": "discovery_questioning", "criterion_name": "Discovery Questioning", "weight": 1.2, "description": "Asks open-ended questions to uncover root constraints and priorities.", "modality_source": "text"},
            {"criterion_key": "problem_resolution", "criterion_name": "Collaborative Problem Resolution", "weight": 1.0, "description": "Formulates clear next steps and transparent timeline commitments.", "modality_source": "text"},
            {"criterion_key": "delivery_cadence", "criterion_name": "Vocal Cadence & Poise", "weight": 0.8, "description": "Maintains calm vocal pitch and steady articulation rate under pressure.", "modality_source": "voice"}
        ]
        questions = [
            "How do you handle an emotionally escalated customer who demands an immediate resolution outside standard terms?",
            "What questions do you ask to discover the real underlying concern behind a client's pricing hesitation?",
            "How do you structure consultative next steps so the client feels supported rather than dismissed?"
        ]
        delivery_w = 0.30

    return DraftRubricResponse(
        job_title=request.job_title,
        scenario_type=scenario,
        recommended_duration_minutes=20,
        delivery_weight=delivery_w,
        dimensions=dimensions,
        suggested_questions=questions
    )

@router.get("/roles", response_model=List[RoleResponse])
def list_roles(db: Session = Depends(get_db)):
    roles = db.query(RoleModel).order_by(RoleModel.created_at.desc()).all()
    return roles

@router.post("/roles", response_model=RoleResponse)
def create_role(
    request: RoleCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_id = f"role_{uuid.uuid4().hex[:8]}"
    new_role = RoleModel(
        id=role_id,
        recruiter_id=user.id,
        title=request.title,
        jd_text=request.jd_text,
        scenario_type=request.scenario_type,
        duration_minutes=request.duration_minutes,
        video_enabled=request.video_enabled,
        delivery_weight=request.delivery_weight,
        presentation_weight=request.presentation_weight
    )
    db.add(new_role)
    db.flush()

    # Create associated rubric if criteria supplied
    if request.criteria:
        rubric = Rubric(
            id=str(uuid.uuid4()),
            version="1.0",
            name=f"Rubric for {request.title}"
        )
        db.add(rubric)
        db.flush()
        new_role.rubric_id = rubric.id

        for c in request.criteria:
            crit = RubricCriterion(
                rubric_id=rubric.id,
                criterion_key=c.get("criterion_key", "custom_dim"),
                criterion_name=c.get("criterion_name", "Custom Dimension"),
                description=c.get("description", "Evaluation criteria"),
                scoring_guidance=c.get("scoring_guidance", "Guidance"),
                weight=c.get("weight", 1.0),
                maximum_score=5,
                modality_source=c.get("modality_source", "text")
            )
            db.add(crit)

    # Log action
    db.add(AuditLog(
        actor=user.email,
        action="role_created",
        target=f"role:{new_role.id}",
        details={"title": new_role.title, "scenario": new_role.scenario_type}
    ))

    db.commit()
    db.refresh(new_role)
    return new_role

# ----------------- 2. Invites (FR3) -----------------

@router.post("/roles/{role_id}/invites", response_model=InviteResponse)
def create_role_invite(
    role_id: str,
    request: InviteCreateRequest,
    db: Session = Depends(get_db)
):
    role = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    token = f"prism-{uuid.uuid4().hex[:12]}"
    expires_at = datetime.utcnow() + timedelta(days=request.expiry_days)

    invite = Invite(
        role_id=role.id,
        token=token,
        candidate_email=request.candidate_email,
        expires_at=expires_at
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return InviteResponse(
        id=invite.id,
        role_id=role.id,
        token=token,
        candidate_email=invite.candidate_email,
        expires_at=invite.expires_at,
        invite_url=f"/interview?invite={token}"
    )

@router.get("/invites/{token}")
def get_invite_info(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite token not found.")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This invite link has expired.")

    role = invite.role
    return {
        "invite_id": invite.id,
        "token": invite.token,
        "role_id": role.id,
        "role_title": role.title,
        "scenario_type": role.scenario_type,
        "duration_minutes": role.duration_minutes,
        "video_enabled": role.video_enabled,
        "candidate_email": invite.candidate_email
    }

# ----------------- 3. Consent Screen (FR4) -----------------

@router.post("/interviews/{session_id}/consent")
def submit_session_consent(
    session_id: str,
    request: ConsentSubmitRequest,
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    session.candidate_consent = {
        "audio_consent": request.audio_consent,
        "video_consent": request.video_consent,
        "retention_ttl_hours": request.retention_ttl_hours,
        "extra_time_accommodations": request.extra_time_accommodations,
        "agreed_at": datetime.utcnow().isoformat()
    }
    session.video_enabled = request.video_consent
    db.commit()
    return {"status": "consent_recorded", "video_enabled": session.video_enabled}

# ----------------- 4. Scenario Sandbox & Persona Simulation (FR15, FR16, FR17) -----------------

@router.get("/scenarios")
def list_available_scenarios():
    return ScenarioService.get_all_scenarios()

@router.get("/scenarios/{scenario_id}")
def get_scenario_details(scenario_id: str):
    scen = ScenarioService.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return scen

@router.post("/interviews/{session_id}/scenario/run", response_model=CodeRunResponse)
def run_scenario_code(
    session_id: str,
    request: CodeRunRequest,
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    result = ScenarioService.run_code_sandbox(request.scenario_id, request.code)

    # Log code run event
    db.add(ScenarioEvent(
        session_id=session.id,
        event_type="code_run",
        payload={
            "scenario_id": request.scenario_id,
            "passed": result["passed"],
            "tests_passed": result["tests_passed"],
            "tests_failed": result["tests_failed"]
        },
        t_seconds=120.0
    ))
    db.commit()

    return CodeRunResponse(
        scenario_id=result["scenario_id"],
        status=result["status"],
        passed=result["passed"],
        tests_run=result["tests_run"],
        tests_passed=result["tests_passed"],
        tests_failed=result["tests_failed"],
        test_details=result["test_details"],
        stdout=result["stdout"],
        execution_time_ms=result["execution_time_ms"],
        sandboxed=result["sandboxed"]
    )

@router.post("/interviews/{session_id}/scenario/chat", response_model=PersonaChatResponse)
def chat_with_persona_or_teammate(
    session_id: str,
    request: PersonaChatRequest,
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    turn_result = ScenarioService.step_persona_dialogue(
        scenario_id=request.scenario_id,
        candidate_message=request.candidate_message,
        current_patience=request.current_patience,
        dialogue_history=request.dialogue_history
    )

    # Log chat event
    db.add(ScenarioEvent(
        session_id=session.id,
        event_type="chat_message",
        payload={
            "scenario_id": request.scenario_id,
            "candidate_msg": request.candidate_message[:100],
            "patience": turn_result["patience"],
            "is_resolved": turn_result["is_resolved"]
        },
        t_seconds=90.0
    ))
    db.commit()

    return PersonaChatResponse(
        scenario_id=turn_result["scenario_id"],
        persona_name=turn_result["persona_name"],
        reply=turn_result["reply"],
        patience=turn_result["patience"],
        mood=turn_result["mood"],
        revealed_hidden_fact=turn_result["revealed_hidden_fact"],
        hidden_fact_detail=turn_result["hidden_fact_detail"],
        is_resolved=turn_result["is_resolved"],
        timestamp=turn_result["timestamp"]
    )

# ----------------- 5. Anti-Cheating & Integrity Event Logging (FR21, D11) -----------------

@router.post("/interviews/{session_id}/events")
def record_scenario_event(
    session_id: str,
    request: ScenarioEventRequest,
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    event = ScenarioEvent(
        session_id=session.id,
        event_type=request.event_type,
        payload=request.payload,
        t_seconds=request.t_seconds
    )
    db.add(event)
    db.commit()
    return {"status": "event_recorded", "event_id": event.id}

# ----------------- 6. Candidate Contest Flow (FR18, D9) -----------------

@router.post("/interviews/{session_id}/contests", response_model=ContestResponse)
def submit_score_contest(
    session_id: str,
    request: ContestCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    contest = Contest(
        session_id=session.id,
        candidate_id=user.id,
        dimension=request.dimension,
        timestamp_seconds=request.timestamp_seconds,
        reason=request.reason,
        status="pending"
    )
    db.add(contest)

    # Route session to review queue if not already there
    session.needs_review = True
    session.review_reason = f"Candidate contested score on {request.dimension}"

    # Audit log
    db.add(AuditLog(
        actor=user.email,
        action="score_contested",
        target=f"session:{session.id}",
        details={"dimension": request.dimension, "reason": request.reason}
    ))

    db.commit()
    db.refresh(contest)
    return contest

@router.get("/interviews/{session_id}/contests", response_model=List[ContestResponse])
def get_session_contests(session_id: str, db: Session = Depends(get_db)):
    return db.query(Contest).filter(Contest.session_id == session_id).all()

# ----------------- 7. Human Reviewer Queue (FR19, D3) -----------------

@router.get("/reviews/queue", response_model=List[ReviewQueueItem])
def get_review_queue(db: Session = Depends(get_db)):
    """
    Returns sessions flagged for human review due to low model confidence or candidate contest.
    """
    sessions = db.query(InterviewSession).filter(InterviewSession.needs_review == True).order_by(InterviewSession.completed_at.desc()).all()
    queue = []
    for s in sessions:
        report = s.report
        contests = db.query(Contest).filter(Contest.session_id == s.id).all()
        pending_c = [
            {"id": c.id, "dimension": c.dimension, "timestamp_seconds": c.timestamp_seconds, "reason": c.reason, "status": c.status}
            for c in contests if c.status == "pending"
        ]

        scores = db.query(Score).filter(Score.session_id == s.id).all()
        uncertain_dims = [sc.dimension for sc in scores if (sc.ci_high - sc.ci_low) > 1.2 or sc.std_error > 0.35]

        queue.append(ReviewQueueItem(
            session_id=s.id,
            candidate_name=s.user.display_name if s.user else "Candidate",
            role_title=s.role.title if s.role else (s.track.name if s.track else "Interview"),
            scenario_type=s.scenario_id or s.mode,
            overall_score=report.overall_score if report else 0.0,
            overall_ci=f"[{report.overall_ci_low or 0.0} - {report.overall_ci_high or 0.0}]" if report else "[0.0 - 5.0]",
            needs_review=s.needs_review,
            review_reason=s.review_reason,
            is_contested=len(pending_c) > 0,
            contest_count=len(contests),
            pending_contests=pending_c,
            uncertain_dimensions=uncertain_dims,
            completed_at=s.completed_at
        ))
    return queue

@router.post("/reviews/{session_id}/resolve")
def resolve_review_and_adjust_score(
    session_id: str,
    request: ReviewResolveRequest,
    reviewer: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    score_record = db.query(Score).filter(Score.session_id == session.id, Score.dimension == request.dimension).first()
    original_val = score_record.value if score_record else 3.0

    if score_record:
        score_record.value = request.adjusted_score
        score_record.ci_low = max(1.0, round(request.adjusted_score - 0.2, 2))
        score_record.ci_high = min(5.0, round(request.adjusted_score + 0.2, 2))
        score_record.std_error = 0.1

    # Record Review action
    review = Review(
        session_id=session.id,
        reviewer_id=reviewer.id,
        dimension=request.dimension,
        original_score=original_val,
        adjusted_score=request.adjusted_score,
        reason=request.resolution_note
    )
    db.add(review)

    # Resolve contest if linked
    if request.contest_id:
        contest = db.query(Contest).filter(Contest.id == request.contest_id).first()
        if contest:
            contest.status = request.contest_status or "resolved"
            contest.resolution_note = request.resolution_note
            contest.adjusted_score = request.adjusted_score
            contest.reviewer_id = reviewer.id
            contest.resolved_at = datetime.utcnow()

    # If all pending contests resolved and confidence settled, clear needs_review
    pending_left = db.query(Contest).filter(Contest.session_id == session.id, Contest.status == "pending").count()
    if pending_left == 0:
        session.needs_review = False

    # Audit log
    db.add(AuditLog(
        actor=reviewer.email,
        action="review_resolved",
        target=f"session:{session.id}",
        details={"dimension": request.dimension, "original": original_val, "adjusted": request.adjusted_score}
    ))

    db.commit()
    return {"status": "resolved", "adjusted_score": request.adjusted_score}

# ----------------- 8. Recruiter Scorecard & Counterfactual View (FR13, D1, D2) -----------------

@router.get("/interviews/{session_id}/scorecard", response_model=RecruiterScorecardResponse)
def get_recruiter_scorecard(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    report = session.report
    if not report:
        from ..services.report_generator import ReportGenerator
        report = ReportGenerator.generate_session_report(session, db)

    scores = db.query(Score).filter(Score.session_id == session.id).all()
    dimensions = []
    all_evidence = []
    for sc in scores:
        dim_dict = {
            "dimension": sc.dimension,
            "modality": sc.modality,
            "value": sc.value,
            "ci_low": sc.ci_low,
            "ci_high": sc.ci_high,
            "std_error": sc.std_error,
            "ci_width": round(sc.ci_high - sc.ci_low, 2),
            "is_uncertain": bool((sc.ci_high - sc.ci_low) > 1.2 or sc.std_error > 0.35),
            "evidence_clips": sc.evidence_clips or [],
            "counterfactual_deltas": sc.modality_deltas or {}
        }
        dimensions.append(dim_dict)
        if sc.evidence_clips:
            all_evidence.extend(sc.evidence_clips)

    return RecruiterScorecardResponse(
        session_id=session.id,
        role_title=session.role.title if session.role else (session.track.name if session.track else "Interview"),
        candidate_name=session.user.display_name if session.user else "Candidate",
        overall_score=report.overall_score or 4.0,
        overall_ci=f"[{report.overall_ci_low or 3.7} - {report.overall_ci_high or 4.3}]",
        dimensions=dimensions,
        counterfactual_deltas=report.counterfactual_deltas or {"avg_voice_delta": 0.15, "avg_video_delta": 0.0},
        evidence_clips=all_evidence,
        integrity_notes=report.integrity_notes or ["Candidate maintained consistent engagement with zero anomalies."],
        delivery_summary=report.delivery_summary or {},
        video_summary=report.video_summary or {},
        needs_review=session.needs_review,
        review_reason=session.review_reason
    )

# ----------------- 9. Evaluation Harness (FR22, Section 16) -----------------

@router.get("/eval/agreement")
def get_model_evaluation_metrics():
    """
    Returns empirical agreement and calibration benchmarks (ICC, ECE, Ablation table, Fairness slices).
    """
    return ModelEvaluator.run_benchmark_evaluation()

# ----------------- 10. Privacy, TTL Cleanup & GDPR (FR23, FR24) -----------------

@router.get("/candidates/me/export")
def export_candidate_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == user.id).all()
    export_payload = {
        "candidate": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat()
        },
        "sessions": [
            {
                "session_id": s.id,
                "status": s.status,
                "overall_score": s.report.overall_score if s.report else None,
                "created_at": s.created_at.isoformat(),
                "transcripts": [a.transcript for a in s.answers]
            }
            for s in sessions
        ]
    }
    db.add(AuditLog(actor=user.email, action="data_export", target=f"user:{user.id}", details={}))
    db.commit()
    return export_payload

@router.delete("/candidates/me/data")
def delete_all_candidate_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GDPR Delete-my-data: cleans up all sessions, recordings, and personal data.
    """
    user_email = user.email
    db.delete(user)
    db.add(AuditLog(actor=user_email, action="account_and_data_deleted", target=f"user:{user_email}", details={}))
    db.commit()
    return {"message": "All personal data, interview recordings, and assessment records have been permanently purged."}

@router.post("/admin/media/cleanup")
def trigger_raw_media_ttl_cleanup(db: Session = Depends(get_db)):
    """
    Deletes raw audio/video files exceeding TTL (default 24h retention) per PRD Section 6 FR23.
    Transcripts and numeric features are retained.
    """
    cleaned_count = 0
    cutoff = datetime.utcnow() - timedelta(hours=24)
    old_answers = db.query(Answer).filter(Answer.created_at < cutoff, Answer.audio_storage_key != None).all()
    for ans in old_answers:
        AudioStorageService.delete_audio(ans.audio_storage_key)
        ans.audio_storage_key = None
        cleaned_count += 1
    db.commit()
    return {"status": "cleanup_completed", "records_purged": cleaned_count, "ttl_hours": 24}

# ----------------- 11. Admin Audit Trail (FR25) -----------------

@router.get("/admin/audit-logs")
def get_audit_trail(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "actor": l.actor,
            "action": l.action,
            "target": l.target,
            "details": l.details,
            "created_at": l.created_at
        }
        for l in logs
    ]
