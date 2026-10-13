from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Auth & User Schemas -----------------

class UserRegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=100)
    display_name: str = Field(min_length=2, max_length=100)
    consent_recording: bool = True

class UserLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    consent_recording: bool
    account_status: str
    privacy_preferences: Dict[str, Any] = {}
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    consent_recording: Optional[bool] = None
    privacy_preferences: Optional[Dict[str, Any]] = None

# ----------------- Tracks & Rubrics -----------------

class StageInfo(BaseModel):
    stage_id: str
    title: str
    sequence: int
    description: str
    prompt_template: str
    expected_concepts: List[str] = []

class RubricCriterionResponse(BaseModel):
    id: str
    criterion_key: str
    criterion_name: str
    description: str
    scoring_guidance: str
    weight: float
    maximum_score: int
    model_config = ConfigDict(from_attributes=True)

class TrackResponse(BaseModel):
    id: str
    name: str
    description: str
    track_type: str
    is_active: bool
    stages: List[StageInfo] = []
    criteria: List[RubricCriterionResponse] = []

# ----------------- Interview Session Lifecycle -----------------

class InterviewCreateRequest(BaseModel):
    track_id: str
    difficulty: str = "intermediate"  # beginner, intermediate, advanced
    duration_minutes: int = 10         # 5, 10, 20
    voice_preference: str = "default"

class QuestionResponse(BaseModel):
    id: str
    question_text: str
    question_type: str  # initial, follow_up
    sequence_number: int
    interview_stage: str
    context_notes: Optional[str] = None
    expected_concepts: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class InterviewSessionResponse(BaseModel):
    id: str
    track_id: str
    track_name: str
    difficulty: str
    duration_minutes: int
    voice_preference: str
    status: str  # created, in_progress, paused, completed, abandoned
    current_stage: Optional[str] = None
    current_stage_index: int = 0
    total_stages: int = 5
    current_question: Optional[QuestionResponse] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Answers & Assessments -----------------

class AnswerSubmitRequest(BaseModel):
    question_id: str
    transcript: str = Field(min_length=5, max_length=15000)
    is_edited: bool = False

class CriterionAssessmentResult(BaseModel):
    criterion_key: str
    criterion_name: str
    score: int  # 0 to 4
    maximum_score: int = 4
    rationale: str
    evidence: Optional[str] = None
    missing_elements: Optional[str] = None

class AnswerResponse(BaseModel):
    answer_id: str
    question_id: str
    stage: str
    transcript: str
    next_action: str  # "follow_up", "next_stage", "completed"
    message: str
    follow_up_question: Optional[QuestionResponse] = None
    next_question: Optional[QuestionResponse] = None
    stage_assessments: List[CriterionAssessmentResult] = []
    audio_metrics: Optional[Dict[str, Any]] = None

# ----------------- Final Report Schemas -----------------

class SessionReportResponse(BaseModel):
    session_id: str
    track_id: str
    track_name: str
    difficulty: str
    duration_minutes: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    summary: str
    content_score: float  # 0 - 100%
    delivery_summary: Dict[str, Any]
    overall_score: Optional[float] = None
    strengths: List[str] = []
    improvement_areas: List[str] = []
    criteria_breakdown: List[Dict[str, Any]] = []
    qa_history: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

# ----------------- Progress & History -----------------

class SessionHistoryItem(BaseModel):
    id: str
    track_id: str
    track_name: str
    difficulty: str
    status: str
    content_score: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: int

class ProgressOverviewResponse(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_practice_minutes: int
    average_content_score: float
    score_trend: List[Dict[str, Any]] = []

class CriterionTrendItem(BaseModel):
    criterion_key: str
    criterion_name: str
    average_score: float
    maximum_score: int
    attempts_count: int
    mastery_percentage: float

class RecommendationItem(BaseModel):
    id: str
    criterion_id: Optional[str] = None
    recommendation_text: str
    priority: str
    status: str
