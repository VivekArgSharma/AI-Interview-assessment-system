import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON
)
from sqlalchemy.orm import relationship
from ..db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    role = Column(String(50), default="candidate", nullable=False)  # candidate, recruiter, reviewer, admin
    consent_recording = Column(Boolean, default=True, nullable=False)
    privacy_preferences = Column(JSON, default=dict)
    account_status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    roles_created = relationship("RoleModel", back_populates="recruiter", cascade="all, delete-orphan")
    reviews_conducted = relationship("Review", back_populates="reviewer")

class RoleModel(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recruiter_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    jd_text = Column(Text, nullable=False)
    scenario_type = Column(String(100), default="standard", nullable=False)  # standard, S1, S2, S3, N1, N2, N3
    duration_minutes = Column(Integer, default=20, nullable=False)
    video_enabled = Column(Boolean, default=True, nullable=False)
    delivery_weight = Column(Float, default=0.2, nullable=False)  # default low role-dependent weight
    presentation_weight = Column(Float, default=0.0, nullable=False)  # default 0 descriptive
    rubric_id = Column(String(36), ForeignKey("rubrics.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    recruiter = relationship("User", back_populates="roles_created")
    rubric = relationship("Rubric", foreign_keys=[rubric_id])
    invites = relationship("Invite", back_populates="role", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="role")

class Invite(Base):
    __tablename__ = "invites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    candidate_email = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    role = relationship("RoleModel", back_populates="invites")

class InterviewTrack(Base):
    __tablename__ = "interview_tracks"

    id = Column(String(50), primary_key=True)  # e.g. "sales", "bug_fixing"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    track_type = Column(String(50), nullable=False)  # "non_technical", "technical"
    is_active = Column(Boolean, default=True, nullable=False)
    stages = Column(JSON, default=list)  # list of stage objects
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    rubrics = relationship("Rubric", back_populates="track", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="track")

class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    track_id = Column(String(50), ForeignKey("interview_tracks.id"), nullable=True)
    version = Column(String(20), default="1.0", nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    track = relationship("InterviewTrack", back_populates="rubrics")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan")

class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rubric_id = Column(String(36), ForeignKey("rubrics.id"), nullable=False)
    criterion_key = Column(String(100), nullable=False)  # e.g. "discovery", "problem_decomposition"
    criterion_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    scoring_guidance = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    weight = Column(Float, default=1.0, nullable=False)
    maximum_score = Column(Integer, default=5, nullable=False)  # 1-5 rubric scale per PRD
    modality_source = Column(String(50), default="text", nullable=False)  # text, voice, video, scenario_events

    rubric = relationship("Rubric", back_populates="criteria")
    assessments = relationship("Assessment", back_populates="criterion")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    track_id = Column(String(50), ForeignKey("interview_tracks.id"), nullable=True)
    rubric_version_id = Column(String(36), ForeignKey("rubrics.id"), nullable=True)
    mode = Column(String(50), default="standard", nullable=False)  # standard, tech_scenario, non_tech_simulation, practice
    scenario_id = Column(String(50), nullable=True)  # S1, S2, S3, N1, N2, N3
    difficulty = Column(String(50), default="intermediate", nullable=False)  # beginner, intermediate, advanced
    duration_minutes = Column(Integer, default=15, nullable=False)
    voice_preference = Column(String(50), default="default", nullable=False)
    video_enabled = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="created", nullable=False)  # created, in_progress, paused, completed, abandoned
    current_stage = Column(String(100), nullable=True)
    current_stage_index = Column(Integer, default=0, nullable=False)
    follow_up_count_current_stage = Column(Integer, default=0, nullable=False)
    needs_review = Column(Boolean, default=False, nullable=False)
    review_reason = Column(String(100), nullable=True)  # low_confidence, contested, integrity_flag
    candidate_consent = Column(JSON, default=dict)  # audio: true, video: true/false, retention_ttl: 24h
    integrity_signals = Column(JSON, default=list)  # tab focus loss, paste counts, constraint change responses
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    configuration = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")
    role = relationship("RoleModel", back_populates="sessions")
    track = relationship("InterviewTrack", back_populates="sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan", order_by="Question.sequence_number")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="session", uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="session", cascade="all, delete-orphan")
    contests = relationship("Contest", back_populates="session", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="session", cascade="all, delete-orphan")
    video_features = relationship("VideoFeature", back_populates="session", cascade="all, delete-orphan")
    scenario_events = relationship("ScenarioEvent", back_populates="session", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="initial", nullable=False)  # initial, follow_up, probe_uncertainty, probe_depth, probe_integrity
    targeted_dimension = Column(String(100), nullable=True)  # dimension targeted by uncertainty probe (D4)
    sequence_number = Column(Integer, nullable=False)
    interview_stage = Column(String(100), nullable=False)
    context_notes = Column(Text, nullable=True)
    expected_concepts = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")

class Answer(Base):
    __tablename__ = "answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=False, index=True)
    transcript = Column(Text, nullable=False)
    edited_transcript = Column(Text, nullable=True)
    audio_storage_key = Column(String(255), nullable=True)
    audio_duration_seconds = Column(Float, default=0.0, nullable=False)
    t_start = Column(Float, default=0.0, nullable=False)
    t_end = Column(Float, default=0.0, nullable=False)
    transcription_status = Column(String(50), default="success", nullable=False)
    assessment_status = Column(String(50), default="completed", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    audio_metric = relationship("AudioMetric", back_populates="answer", uselist=False, cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="answer", cascade="all, delete-orphan")

class AudioMetric(Base):
    __tablename__ = "audio_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    answer_id = Column(String(36), ForeignKey("answers.id"), unique=True, nullable=False)
    speech_duration_seconds = Column(Float, default=0.0, nullable=False)
    speaking_rate = Column(Float, default=0.0, nullable=False)  # total WPM
    articulation_rate = Column(Float, default=0.0, nullable=False)  # active WPM
    pause_count = Column(Integer, default=0, nullable=False)
    total_pause_duration_seconds = Column(Float, default=0.0, nullable=False)
    mean_pause_duration_seconds = Column(Float, default=0.0, nullable=False)
    longest_pause_seconds = Column(Float, default=0.0, nullable=False)
    filler_count = Column(Integer, default=0, nullable=False)
    pitch_mean_hz = Column(Float, default=140.0, nullable=False)
    pitch_std_hz = Column(Float, default=24.0, nullable=False)
    audio_quality_status = Column(String(50), default="good", nullable=False)
    analysis_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    answer = relationship("Answer", back_populates="audio_metric")

class VideoFeature(Base):
    __tablename__ = "video_features"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    t_seconds = Column(Float, default=0.0, nullable=False)
    framing_stability = Column(Float, default=0.92, nullable=False)  # 0.0 - 1.0 face centering ratio
    gaze_at_camera_ratio = Column(Float, default=0.85, nullable=False)  # 0.0 - 1.0 gaze ratio
    head_pose_variance = Column(Float, default=0.12, nullable=False)  # low variance = stable
    descriptive_notes = Column(Text, default="Candidate maintained stable framing and natural gaze.", nullable=False)
    features_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="video_features")

class ScenarioEvent(Base):
    __tablename__ = "scenario_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # code_run, code_edit, test_result, chat_message, escalation_change, tab_blur, paste
    payload = Column(JSON, default=dict)
    t_seconds = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="scenario_events")

class Score(Base):
    __tablename__ = "scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    dimension = Column(String(100), nullable=False)  # Relevance, Correctness, Decomposition, Trade-offs, Clarity, Conciseness, Pace, Fluency, etc.
    modality = Column(String(50), default="fused", nullable=False)  # text, voice, video, fused
    value = Column(Float, default=0.0, nullable=False)  # 1.0 - 5.0 score
    ci_low = Column(Float, default=0.0, nullable=False)  # Calibrated lower confidence bound
    ci_high = Column(Float, default=5.0, nullable=False)  # Calibrated upper confidence bound
    std_error = Column(Float, default=0.3, nullable=False)
    model_version = Column(String(100), default="prism_multimodal_v1", nullable=False)
    evidence_clips = Column(JSON, default=list)  # list of {t_start, t_end, excerpt, reason}
    modality_deltas = Column(JSON, default=dict)  # counterfactual ablation deltas: {without_voice: -0.4, without_video: 0.0}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="scores")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    answer_id = Column(String(36), ForeignKey("answers.id"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("rubric_criteria.id"), nullable=False)
    score = Column(Integer, default=0, nullable=False)  # 0 to 5
    confidence = Column(Float, default=1.0, nullable=False)
    rationale = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)  # verbatim excerpt from candidate transcript
    missing_elements = Column(Text, nullable=True)
    model_version = Column(String(50), default="sentence_bert_rubric_v1", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    answer = relationship("Answer", back_populates="assessments")
    criterion = relationship("RubricCriterion", back_populates="assessments")

class Contest(Base):
    __tablename__ = "contests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    candidate_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    dimension = Column(String(100), nullable=False)
    timestamp_seconds = Column(Float, default=0.0, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, resolved, rejected
    resolution_note = Column(Text, nullable=True)
    adjusted_score = Column(Float, nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    session = relationship("InterviewSession", back_populates="contests")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    dimension = Column(String(100), nullable=False)
    original_score = Column(Float, nullable=False)
    adjusted_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_conducted")

class HumanRating(Base):
    __tablename__ = "human_ratings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), nullable=False, index=True)
    rater_id = Column(String(100), nullable=False)
    dimension = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)  # 1.0 - 5.0
    rationale = Column(Text, nullable=True)
    subgroup = Column(String(100), default="general", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor = Column(String(255), nullable=False)
    action = Column(String(255), nullable=False)
    target = Column(String(255), nullable=False)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    content_score = Column(Float, default=0.0, nullable=False)  # 0-100% or 1.0-5.0
    delivery_summary = Column(JSON, default=dict)  # aggregated acoustic metrics
    video_summary = Column(JSON, default=dict)  # descriptive visual metrics
    overall_score = Column(Float, nullable=True)  # Overall weighted score
    overall_ci_low = Column(Float, nullable=True)
    overall_ci_high = Column(Float, nullable=True)
    strengths = Column(JSON, default=list)
    improvement_areas = Column(JSON, default=list)  # Top 3 improvement areas with drills & evidence
    drills = Column(JSON, default=list)  # actionable practice drills
    modality_breakdown = Column(JSON, default=dict)  # text, voice, video separate scores
    counterfactual_deltas = Column(JSON, default=dict)  # re-scored deltas
    integrity_notes = Column(JSON, default=list)  # anti-cheating observations
    score_configuration = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="report")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    criterion_id = Column(String(50), nullable=True)
    recommendation_text = Column(Text, nullable=False)
    priority = Column(String(20), default="medium", nullable=False)  # high, medium, low
    status = Column(String(20), default="active", nullable=False)  # active, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="recommendations")
