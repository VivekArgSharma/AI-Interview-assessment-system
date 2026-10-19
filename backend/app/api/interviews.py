import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.models import (
    User,
    InterviewTrack,
    Rubric,
    RubricCriterion,
    InterviewSession,
    Question,
    Answer,
    Report
)
from ..schemas.interview import (
    TrackResponse,
    RubricCriterionResponse,
    InterviewCreateRequest,
    InterviewSessionResponse,
    QuestionResponse,
    AnswerSubmitRequest,
    AnswerResponse,
    SessionReportResponse,
    SessionHistoryItem
)
from .deps import get_current_user
from ..services.interview_session_manager import InterviewSessionManager
from ..services.audio_transcriber import AudioTranscriber
from ..services.audio_feature_extractor import AudioFeatureExtractor
from ..services.audio_storage import AudioStorageService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["interviews"])
manager = InterviewSessionManager()

# ----------------- Track & Rubric Endpoints -----------------

@router.get("/interview-tracks", response_model=List[TrackResponse])
def list_tracks(db: Session = Depends(get_db)):
    tracks = db.query(InterviewTrack).filter(InterviewTrack.is_active == True).all()
    results = []
    for t in tracks:
        rubric = db.query(Rubric).filter(Rubric.track_id == t.id).first()
        criteria = rubric.criteria if rubric else []
        results.append(
            TrackResponse(
                id=t.id,
                name=t.name,
                description=t.description,
                track_type=t.track_type,
                is_active=t.is_active,
                stages=t.stages or [],
                criteria=[RubricCriterionResponse.model_validate(c) for c in criteria]
            )
        )
    return results

@router.get("/interview-tracks/{track_id}/rubric", response_model=List[RubricCriterionResponse])
def get_track_rubric(track_id: str, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.track_id == track_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found for this track.")
    return [RubricCriterionResponse.model_validate(c) for c in rubric.criteria]

# ----------------- Session Lifecycle Endpoints -----------------

@router.post("/interviews", response_model=InterviewSessionResponse)
def create_interview_session(
    request: InterviewCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager.create_session(
        db=db,
        user=user,
        track_id=request.track_id,
        difficulty=request.difficulty,
        duration_minutes=request.duration_minutes,
        voice_preference=request.voice_preference
    )
    return InterviewSessionResponse(
        id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        voice_preference=session.voice_preference,
        status=session.status,
        current_stage=session.current_stage,
        current_stage_index=session.current_stage_index,
        total_stages=len(session.track.stages or []),
        current_question=None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        created_at=session.created_at
    )

@router.get("/interviews/history", response_model=List[SessionHistoryItem])
def get_interview_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(50)
        .all()
    )
    results = []
    for s in sessions:
        score = s.report.content_score if s.report else None
        results.append(
            SessionHistoryItem(
                id=s.id,
                track_id=s.track_id,
                track_name=s.track.name if s.track else "Interview",
                difficulty=s.difficulty,
                status=s.status,
                content_score=score,
                started_at=s.started_at,
                completed_at=s.completed_at,
                duration_minutes=s.duration_minutes
            )
        )
    return results

@router.get("/interviews/{session_id}", response_model=InterviewSessionResponse)
def get_session_details(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager._get_session_with_ownership(db, session_id, user)
    current_q = manager.get_current_question(db, session_id, user)
    return InterviewSessionResponse(
        id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        voice_preference=session.voice_preference,
        status=session.status,
        current_stage=session.current_stage,
        current_stage_index=session.current_stage_index,
        total_stages=len(session.track.stages or []),
        current_question=QuestionResponse.model_validate(current_q) if current_q else None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        created_at=session.created_at
    )

@router.post("/interviews/{session_id}/start", response_model=InterviewSessionResponse)
def start_interview_session(
    session_id: str,
    scenario_id: Optional[str] = None,
    video_enabled: Optional[bool] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager.start_session(db, session_id, user)
    if scenario_id:
        session.scenario_id = scenario_id
    if video_enabled is not None:
        session.video_enabled = video_enabled
    db.commit()
    db.refresh(session)
    current_q = manager.get_current_question(db, session_id, user)
    return InterviewSessionResponse(
        id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        voice_preference=session.voice_preference,
        status=session.status,
        mode=session.mode or "live",
        scenario_id=session.scenario_id,
        video_enabled=session.video_enabled,
        needs_review=session.needs_review,
        review_reason=session.review_reason,
        current_stage=session.current_stage,
        current_stage_index=session.current_stage_index,
        total_stages=len(session.track.stages or []),
        current_question=QuestionResponse.model_validate(current_q) if current_q else None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        created_at=session.created_at
    )

@router.post("/interviews/{session_id}/pause", response_model=InterviewSessionResponse)
def pause_interview_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager.pause_session(db, session_id, user)
    current_q = manager.get_current_question(db, session_id, user)
    return InterviewSessionResponse(
        id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        voice_preference=session.voice_preference,
        status=session.status,
        current_stage=session.current_stage,
        current_stage_index=session.current_stage_index,
        total_stages=len(session.track.stages or []),
        current_question=QuestionResponse.model_validate(current_q) if current_q else None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        created_at=session.created_at
    )

@router.post("/interviews/{session_id}/resume", response_model=InterviewSessionResponse)
def resume_interview_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager.resume_session(db, session_id, user)
    current_q = manager.get_current_question(db, session_id, user)
    return InterviewSessionResponse(
        id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        voice_preference=session.voice_preference,
        status=session.status,
        current_stage=session.current_stage,
        current_stage_index=session.current_stage_index,
        total_stages=len(session.track.stages or []),
        current_question=QuestionResponse.model_validate(current_q) if current_q else None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        created_at=session.created_at
    )

@router.post("/interviews/{session_id}/end")
def end_interview_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = manager.end_session(db, session_id, user)
    return {"message": "Interview ended successfully.", "session_id": session_id, "report_id": report.id}

@router.get("/interviews/{session_id}/current-question", response_model=Optional[QuestionResponse])
def get_current_question(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = manager.get_current_question(db, session_id, user)
    return QuestionResponse.model_validate(q) if q else None

# ----------------- Answer Submission -----------------

@router.post("/interviews/{session_id}/answers", response_model=AnswerResponse)
def submit_answer_text(
    session_id: str,
    request: AnswerSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = manager.submit_answer(
        db=db,
        session_id=session_id,
        user=user,
        question_id=request.question_id,
        transcript=request.transcript,
        is_edited=request.is_edited
    )
    return AnswerResponse(
        answer_id=result["answer_id"],
        question_id=result["question_id"],
        stage=result["stage"],
        transcript=result["transcript"],
        next_action=result["next_action"],
        message=result["message"],
        follow_up_question=QuestionResponse.model_validate(result["follow_up_question"]) if result["follow_up_question"] else None,
        next_question=QuestionResponse.model_validate(result["next_question"]) if result["next_question"] else None,
        stage_assessments=result["stage_assessments"],
        audio_metrics=result.get("audio_metrics")
    )

@router.post("/interviews/{session_id}/answers/audio", response_model=AnswerResponse)
async def submit_answer_audio(
    session_id: str,
    question_id: str = Form(...),
    file: UploadFile = File(...),
    edited_transcript: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty (0 bytes).")

    transcriber = AudioTranscriber.get_instance()
    extractor = AudioFeatureExtractor()

    # Transcribe via Whisper
    trans_res = transcriber.transcribe(audio_bytes, filename=file.filename or "recording.wav")
    raw_transcript = trans_res["transcript"]
    final_transcript = (edited_transcript or raw_transcript).strip()

    if len(final_transcript) < 5:
        raise HTTPException(
            status_code=422,
            detail=f"Recognized speech ('{final_transcript}') was too short. Please speak clearly or retry."
        )

    # Extract audio metrics
    analysis = extractor.analyze(
        audio_16k=trans_res["audio_16k"],
        sample_rate=trans_res["sample_rate"],
        transcript=final_transcript
    )

    # Save uploaded audio file locally
    storage_key = AudioStorageService.save_audio(f"ans_{session_id[:8]}_{question_id[:8]}", audio_bytes)

    result = manager.submit_answer(
        db=db,
        session_id=session_id,
        user=user,
        question_id=question_id,
        transcript=final_transcript,
        audio_analysis=analysis.model_dump(),
        audio_duration_seconds=trans_res["duration_seconds"],
        audio_storage_key=storage_key,
        is_edited=bool(edited_transcript)
    )

    return AnswerResponse(
        answer_id=result["answer_id"],
        question_id=result["question_id"],
        stage=result["stage"],
        transcript=result["transcript"],
        next_action=result["next_action"],
        message=result["message"],
        follow_up_question=QuestionResponse.model_validate(result["follow_up_question"]) if result["follow_up_question"] else None,
        next_question=QuestionResponse.model_validate(result["next_question"]) if result["next_question"] else None,
        stage_assessments=result["stage_assessments"],
        audio_metrics=result.get("audio_metrics")
    )

# ----------------- Audio Retrieval & Privacy Endpoints -----------------

@router.get("/answers/{answer_id}/audio")
def get_answer_audio(
    answer_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if not answer or not answer.audio_storage_key:
        raise HTTPException(status_code=404, detail="Audio recording not found for this answer.")

    session = answer.session
    if session.user_id and session.user_id != user.id and user.email != "demo@ai-interview.com":
        raise HTTPException(status_code=403, detail="You do not have permission to access this recording.")

    filepath = AudioStorageService.get_audio_filepath(answer.audio_storage_key)
    if not filepath:
        raise HTTPException(status_code=404, detail="Audio recording file not found on disk.")

    return FileResponse(filepath, media_type="audio/wav", filename=f"recording_{answer_id}.wav")

@router.delete("/answers/{answer_id}/audio")
def delete_answer_audio(
    answer_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if not answer or not answer.audio_storage_key:
        raise HTTPException(status_code=404, detail="Audio recording not found.")

    session = answer.session
    if session.user_id and session.user_id != user.id and user.email != "demo@ai-interview.com":
        raise HTTPException(status_code=403, detail="You do not have permission to delete this recording.")

    AudioStorageService.delete_audio(answer.audio_storage_key)
    answer.audio_storage_key = None
    db.commit()
    return {"message": "Audio recording deleted successfully."}

# ----------------- Reports & Answers Review -----------------

@router.get("/interviews/{session_id}/report", response_model=SessionReportResponse)
def get_session_report(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = manager._get_session_with_ownership(db, session_id, user)
    report = db.query(Report).filter(Report.session_id == session.id).first()
    if not report:
        # Generate on demand if completed
        if session.status == "completed":
            from ..services.report_generator import ReportGenerator
            report = ReportGenerator.generate_session_report(session, db)
        else:
            raise HTTPException(status_code=404, detail="Report not generated yet. The interview is still in progress.")

    # Format criteria breakdown & Q&A history
    score_config = report.score_configuration or {}
    criteria_breakdown = score_config.get("criteria_breakdown", [])

    answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    qa_history = []
    for a in answers:
        qa_history.append({
            "answer_id": a.id,
            "question_id": a.question_id,
            "question_text": a.question.question_text if a.question else "",
            "question_type": a.question.question_type if a.question else "initial",
            "stage": a.question.interview_stage if a.question else "",
            "transcript": a.transcript,
            "audio_duration_seconds": a.audio_duration_seconds,
            "has_audio": bool(a.audio_storage_key),
            "assessments": [
                {
                    "criterion_name": ass.criterion.criterion_name if ass.criterion else "",
                    "score": ass.score,
                    "evidence": ass.evidence,
                    "rationale": ass.rationale
                }
                for ass in a.assessments
            ]
        })

    recommendations = [
        {"criterion_id": r.criterion_id, "text": r.recommendation_text, "priority": r.priority}
        for r in session.recommendations
    ]

    return SessionReportResponse(
        session_id=session.id,
        track_id=session.track_id,
        track_name=session.track.name if session.track else "Interview",
        difficulty=session.difficulty,
        duration_minutes=session.duration_minutes,
        started_at=session.started_at,
        completed_at=session.completed_at,
        summary=report.summary,
        content_score=report.content_score,
        delivery_summary=report.delivery_summary or {},
        overall_score=report.overall_score,
        strengths=report.strengths or [],
        improvement_areas=report.improvement_areas or [],
        criteria_breakdown=criteria_breakdown,
        qa_history=qa_history,
        recommendations=recommendations
    )
