import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from ..db.database import get_db
from datetime import datetime, timedelta
from ..models.models import (
    User,
    InterviewTrack,
    Rubric,
    RubricCriterion,
    InterviewSession,
    Question,
    Answer,
    Report,
    Assessment,
    AudioMetric,
    Recommendation
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

    from ..services.exemplar_coach_service import ExemplarCoachService

    answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    qa_history = []
    for a in answers:
        q_text = a.question.question_text if a.question else ""
        coach_data = ExemplarCoachService.get_exemplar_and_coach(q_text, a.transcript)
        qa_history.append({
            "answer_id": a.id,
            "question_id": a.question_id,
            "question_text": q_text,
            "question_type": a.question.question_type if a.question else "initial",
            "stage": a.question.interview_stage if a.question else "",
            "transcript": a.transcript,
            "exemplar_answer": coach_data.get("exemplar_answer", ""),
            "key_takeaways": coach_data.get("key_takeaways", []),
            "speech_coach_feedback": coach_data.get("speech_coach_feedback", ""),
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

# ----------------- Realistic Neural Voice & TTS Endpoints -----------------

@router.get("/voice/voices")
def get_available_voices():
    """
    Returns the curated set of realistic human neural voices for interviewers and speech coaches.
    """
    from ..services.voice_synthesizer import VoiceSynthesizer
    return VoiceSynthesizer.get_available_voices()

@router.get("/voice/speak")
async def speak_text(
    text: str = Query(..., min_length=1),
    voice: Optional[str] = Query("en-US-JennyNeural"),
    rate: Optional[str] = Query("+0%")
):
    """
    Synthesizes text into high-definition human neural audio stream using edge-tts.
    Cached on disk for instantaneous zero-latency replay.
    """
    from ..services.voice_synthesizer import VoiceSynthesizer
    synth = VoiceSynthesizer.get_instance()
    try:
        filepath = await synth.synthesize_to_file(text=text, voice=voice, rate=rate)
        return FileResponse(
            path=filepath,
            media_type="audio/mpeg",
            filename="speech.mp3",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    except Exception as e:
        logger.error(f"Voice synthesis endpoint failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice synthesis failed: {str(e)}")

# ----------------- Invigilator / Examiner Demo Showcase -----------------

@router.get("/demo/showcase")
def get_invigilator_showcase():
    """
    Returns curated demo interview scenarios with suboptimal vs exemplar responses,
    rubric evaluation metrics, and vocal delivery coaching for viva / invigilator presentation.
    """
    from ..services.exemplar_coach_service import ExemplarCoachService
    return ExemplarCoachService.get_invigilator_demo_data()


@router.post("/demo/generate-full-interview")
def generate_demo_full_interview(
    track_id: Optional[str] = Query("bug_fixing"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Seeds and completes an entire end-to-end interview session in the database for the user.
    Populated with 5 realistic questions, candidate spoken answers, audio delivery metrics,
    rubric evaluations, and full exemplar comparisons with AI voice coach feedback.
    Enables immediate 1-click demonstration to examiners/invigilators without speaking for 20 mins.
    """
    track = db.query(InterviewTrack).filter(InterviewTrack.id == track_id).first()
    if not track:
        track = db.query(InterviewTrack).first()
    
    rubric = db.query(Rubric).filter(Rubric.track_id == track.id).first()
    criteria = rubric.criteria if rubric else []

    # 1. Create completed interview session
    now = datetime.utcnow()
    start_time = now - timedelta(minutes=14, seconds=35)
    session = InterviewSession(
        user_id=user.id,
        track_id=track.id,
        rubric_version_id=rubric.id if rubric else None,
        difficulty="intermediate",
        duration_minutes=15,
        voice_preference="en-US-JennyNeural",
        video_enabled=True,
        status="completed",
        current_stage="Post-Mortem & Rollout",
        current_stage_index=4,
        started_at=start_time,
        completed_at=now,
        candidate_consent={"audio": True, "video": True, "retention_ttl_hours": 24}
    )
    db.add(session)
    db.flush()

    # 2. Seed 5-stage benchmark questions and candidate answers
    if track.id == "sales":
        scenarios = [
            {
                "stage": "Discovery & Stakeholder Probing",
                "question": "A prospective enterprise buyer mentions their current analytics tool is clunky but fears switching due to team retraining. How do you approach discovery?",
                "transcript": "Um, I would first validate their retraining concern and ask how many weekly hours their team currently loses to that clunky workflow.",
                "duration": 34.0,
                "wpm": 136.0,
                "score": 4.0,
            },
            {
                "stage": "Value Proposition Alignment",
                "question": "The prospect asks why your platform is worth 30% more than their existing provider. How do you frame the value?",
                "transcript": "I lead with total cost of ownership. Our automated pipeline saves roughly 15 engineering hours per sprint per squad, which pays back the difference in under 90 days.",
                "duration": 38.0,
                "wpm": 142.0,
                "score": 4.5,
            },
            {
                "stage": "Objection Handling & Pricing",
                "question": "You are speaking with a prospective client who says your SaaS product looks great but is 25% over their budget. How would you handle this?",
                "transcript": "Well, we can't just give an immediate discount because that devalues the software. Instead, I explore phased rollout or quarterly prepayment to align with their cash flow.",
                "duration": 36.0,
                "wpm": 138.0,
                "score": 4.2,
            },
            {
                "stage": "Stakeholder De-escalation",
                "question": "A key client is furious that a scheduled onboarding milestone was delayed by two days. How do you de-escalate?",
                "transcript": "I apologize immediately and sincerely without making excuses or blaming engineering, take personal responsibility, and provide a clear hourly roadmap for the remaining steps.",
                "duration": 40.0,
                "wpm": 144.0,
                "score": 4.4,
            },
            {
                "stage": "Mutual Commitment Closing",
                "question": "How do you secure mutual commitment from the executive sponsor to sign before the end of the quarter?",
                "transcript": "I anchor their sign-off deadline directly to their internal Q3 go-live milestone so any delay in signature directly jeopardizes their own business deliverable.",
                "duration": 32.0,
                "wpm": 140.0,
                "score": 4.3,
            }
        ]
    else:
        scenarios = [
            {
                "stage": "Defect Origin Triage",
                "question": "An API service started returning duplicate records after a deployment under retry storms. How do you isolate the root cause?",
                "transcript": "When reproduction is intermittent under retry storms, I check distributed traces and server logs, then check whether duplicate rows exist in the database or only in the in-memory accumulator.",
                "duration": 37.0,
                "wpm": 140.0,
                "score": 4.2,
            },
            {
                "stage": "Root Cause Hypothesis",
                "question": "Looking at the worker code, the accumulator dictionary does not reset on network timeout retry. How do you refactor for idempotency?",
                "transcript": "I would enforce an idempotency key using Redis SETNX and ensure the accumulator set deduplicates record IDs so duplicate retry storms don't increment counts twice.",
                "duration": 39.0,
                "wpm": 144.0,
                "score": 4.4,
            },
            {
                "stage": "Automated Sandbox Testing",
                "question": "How do you construct a regression test to prove the retry storm no longer causes duplicate entries?",
                "transcript": "I write an automated unit test mocking the HTTP post with ConnectionError on the first two attempts and success on the third, asserting that the output set count equals exactly the input length.",
                "duration": 42.0,
                "wpm": 138.0,
                "score": 4.6,
            },
            {
                "stage": "Incident Trade-off Decision",
                "question": "Your tech lead suggests increasing timeout limits instead of adding idempotency deduplication. How do you respond?",
                "transcript": "I explain that extending timeouts ties up connection pool threads and doesn't solve network partitions. An idempotency key guarantees correctness regardless of network instability.",
                "duration": 35.0,
                "wpm": 141.0,
                "score": 4.3,
            },
            {
                "stage": "Post-Mortem & Rollout",
                "question": "Summarize the production rollout and monitoring safeguards you establish before merging this fix.",
                "transcript": "I deploy via canary at 10% traffic, monitor p99 latency and 5xx retry rates on Datadog dashboards, and set an automated circuit breaker alert.",
                "duration": 33.0,
                "wpm": 139.0,
                "score": 4.5,
            }
        ]

    for idx, scen in enumerate(scenarios):
        q = Question(
            session_id=session.id,
            question_text=scen["question"],
            question_type="initial",
            sequence_number=idx + 1,
            interview_stage=scen["stage"],
            expected_concepts=["idempotency", "trade-offs", "monitoring"]
        )
        db.add(q)
        db.flush()

        ans = Answer(
            session_id=session.id,
            question_id=q.id,
            transcript=scen["transcript"],
            audio_duration_seconds=scen["duration"],
            audio_storage_key=f"demo_audio_{idx + 1}"
        )
        db.add(ans)
        db.flush()

        metric = AudioMetric(
            answer_id=ans.id,
            speech_duration_seconds=scen["duration"],
            speaking_rate=scen["wpm"],
            articulation_rate=scen["wpm"] + 10.0,
            pause_count=4,
            total_pause_duration_seconds=2.8,
            filler_count=1,
            pitch_mean_hz=142.0,
            pitch_std_hz=22.0,
            audio_quality_status="good"
        )
        db.add(metric)

        # Add assessment linked to criteria
        for c in criteria[:2]:
            ass = Assessment(
                answer_id=ans.id,
                criterion_id=c.id,
                score=scen["score"],
                evidence="Candidate articulated key mechanism and trade-off considerations.",
                rationale="Systematic answer demonstrating solid technical and delivery competencies."
            )
            db.add(ass)

    # 3. Create full Report
    rep = Report(
        session_id=session.id,
        content_score=85.6,
        overall_score=4.3,
        summary="Candidate completed all 5 stages with disciplined technical reasoning, clear trade-off explanations, and calibrated speech delivery pacing (~140 WPM).",
        delivery_summary={
            "average_wpm": 140.0,
            "average_articulation_rate": 150.0,
            "total_pause_count": 18,
            "total_filler_words": 3,
            "has_audio": True
        },
        strengths=[
            "Structured response progression following the STAR architectural model",
            "Consistent vocal cadence within the optimal 135-145 WPM band",
            "Clear articulation of competing trade-offs under high-concurrency failure conditions"
        ],
        improvement_areas=[
            {
                "dimension": "Incident Pacing & Pauses",
                "issue": "Minor rushed phrasing when transitioning from triage observations to code modification.",
                "drill": "Practice deliberate 0.5-second pauses before articulating second-stage refactorings."
            },
            {
                "dimension": "Quantitative Evidence Framing",
                "issue": "Can strengthen confidence by proactively stating latency metrics and database connection limits.",
                "drill": "Incorporate explicit throughput figures (e.g. 50,000 req/sec) into the initial response sentence."
            }
        ],
        score_configuration={
            "criteria_breakdown": [
                {
                    "criterion_id": c.id,
                    "criterion_key": c.criterion_key,
                    "criterion_name": c.criterion_name,
                    "score": 4.3,
                    "maximum_score": 5,
                    "weight": c.weight,
                    "evidence": "Candidate explicitly addressed idempotency keys and retry storms.",
                    "rationale": "High quality answer aligning with industry senior benchmarks."
                }
                for c in criteria
            ]
        }
    )
    db.add(rep)

    # Add recommendations
    rec1 = Recommendation(
        session_id=session.id,
        recommendation_text="Drill verbalizing quantitative failure bounds before jumping into code fixes.",
        priority="high"
    )
    rec2 = Recommendation(
        session_id=session.id,
        recommendation_text="Review neural voice coach exemplar cadence to eliminate remaining hesitation pauses.",
        priority="medium"
    )
    db.add(rec1)
    db.add(rec2)

    db.commit()
    db.refresh(session)
    db.refresh(rep)

    return {
        "session_id": session.id,
        "report_id": rep.id,
        "track_name": track.name,
        "overall_score": rep.overall_score,
        "message": "Full completed 5-stage interview generated successfully."
    }
