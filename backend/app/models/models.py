import uuid
from datetime import datetime
from typing import Optional, List
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
    consent_recording = Column(Boolean, default=True, nullable=False)
    privacy_preferences = Column(JSON, default=dict)
    account_status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")

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
    track_id = Column(String(50), ForeignKey("interview_tracks.id"), nullable=False)
    version = Column(String(20), default="1.0", nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    track = relationship("InterviewTrack", back_populates="rubrics")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan")

class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rubric_id = Column(String(36), ForeignKey("rubrics.id"), nullable=False)
    criterion_key = Column(String(100), nullable=False)  # e.g. "discovery", "hypothesis_formation"
    criterion_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    scoring_guidance = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    weight = Column(Float, default=1.0, nullable=False)
    maximum_score = Column(Integer, default=4, nullable=False)

    rubric = relationship("Rubric", back_populates="criteria")
    assessments = relationship("Assessment", back_populates="criterion")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    track_id = Column(String(50), ForeignKey("interview_tracks.id"), nullable=False)
    rubric_version_id = Column(String(36), ForeignKey("rubrics.id"), nullable=True)
    difficulty = Column(String(50), default="intermediate", nullable=False)  # beginner, intermediate, advanced
    duration_minutes = Column(Integer, default=10, nullable=False)  # 5, 10, 20
    voice_preference = Column(String(50), default="default", nullable=False)
    status = Column(String(50), default="created", nullable=False)  # created, in_progress, paused, completed, abandoned
    current_stage = Column(String(100), nullable=True)
    current_stage_index = Column(Integer, default=0, nullable=False)
    follow_up_count_current_stage = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    configuration = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")
    track = relationship("InterviewTrack", back_populates="sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan", order_by="Question.sequence_number")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="session", uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="initial", nullable=False)  # initial, follow_up
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
    audio_quality_status = Column(String(50), default="good", nullable=False)
    analysis_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    answer = relationship("Answer", back_populates="audio_metric")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    answer_id = Column(String(36), ForeignKey("answers.id"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("rubric_criteria.id"), nullable=False)
    score = Column(Integer, default=0, nullable=False)  # 0 to 4
    confidence = Column(Float, default=1.0, nullable=False)
    rationale = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)  # verbatim excerpt from candidate transcript
    missing_elements = Column(Text, nullable=True)
    model_version = Column(String(50), default="sentence_bert_rubric_v1", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    answer = relationship("Answer", back_populates="assessments")
    criterion = relationship("RubricCriterion", back_populates="assessments")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    content_score = Column(Float, default=0.0, nullable=False)  # 0-100%
    delivery_summary = Column(JSON, default=dict)  # aggregated acoustic metrics
    overall_score = Column(Float, nullable=True)
    strengths = Column(JSON, default=list)
    improvement_areas = Column(JSON, default=list)
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
