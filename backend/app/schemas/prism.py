from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class RoleCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    jd_text: str = Field(min_length=10)
    scenario_type: str = "standard"  # standard, S1, S2, S3, N1, N2, N3
    duration_minutes: int = 20
    video_enabled: bool = True
    delivery_weight: float = 0.20
    presentation_weight: float = 0.0
    criteria: Optional[List[Dict[str, Any]]] = None

class RoleResponse(BaseModel):
    id: str
    title: str
    jd_text: str
    scenario_type: str
    duration_minutes: int
    video_enabled: bool
    delivery_weight: float
    presentation_weight: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DraftRubricRequest(BaseModel):
    job_title: str
    jd_text: str
    scenario_type: str = "standard"

class DraftRubricResponse(BaseModel):
    job_title: str
    scenario_type: str
    recommended_duration_minutes: int
    delivery_weight: float
    dimensions: List[Dict[str, Any]]
    suggested_questions: List[str]

class InviteCreateRequest(BaseModel):
    candidate_email: Optional[str] = None
    expiry_days: int = 14

class InviteResponse(BaseModel):
    id: str
    role_id: str
    token: str
    candidate_email: Optional[str]
    expires_at: datetime
    invite_url: str

class ConsentSubmitRequest(BaseModel):
    audio_consent: bool = True
    video_consent: bool = True
    retention_ttl_hours: int = 24
    extra_time_accommodations: bool = False

class CodeRunRequest(BaseModel):
    scenario_id: str = "S1"
    code: str

class CodeRunResponse(BaseModel):
    scenario_id: str
    status: str
    passed: bool
    tests_run: int
    tests_passed: int
    tests_failed: int
    test_details: List[Dict[str, Any]]
    stdout: str
    execution_time_ms: int
    sandboxed: bool

class PersonaChatRequest(BaseModel):
    scenario_id: str = "N1"
    candidate_message: str
    current_patience: int = 100
    dialogue_history: Optional[List[Dict[str, str]]] = None

class PersonaChatResponse(BaseModel):
    scenario_id: str
    persona_name: str
    reply: str
    patience: int
    mood: str
    revealed_hidden_fact: bool
    hidden_fact_detail: Optional[str] = None
    is_resolved: bool
    timestamp: str

class ScenarioEventRequest(BaseModel):
    event_type: str  # tab_blur, paste, code_edit, code_run, chat_message
    payload: Dict[str, Any] = {}
    t_seconds: float = 0.0

class ContestCreateRequest(BaseModel):
    dimension: str
    timestamp_seconds: float
    reason: str

class ContestResponse(BaseModel):
    id: str
    session_id: str
    dimension: str
    timestamp_seconds: float
    reason: str
    status: str
    created_at: datetime

class ReviewResolveRequest(BaseModel):
    dimension: str
    adjusted_score: float
    resolution_note: str
    contest_id: Optional[str] = None
    contest_status: Optional[str] = "resolved"  # resolved, rejected

class ReviewQueueItem(BaseModel):
    session_id: str
    candidate_name: str
    role_title: str
    scenario_type: str
    overall_score: float
    overall_ci: str
    needs_review: bool
    review_reason: Optional[str]
    is_contested: bool
    contest_count: int
    pending_contests: List[Dict[str, Any]] = []
    uncertain_dimensions: List[str] = []
    completed_at: Optional[datetime]

class RecruiterScorecardResponse(BaseModel):
    session_id: str
    role_title: str
    candidate_name: str
    overall_score: float
    overall_ci: str
    dimensions: List[Dict[str, Any]]
    counterfactual_deltas: Dict[str, Any]
    evidence_clips: List[Dict[str, Any]]
    integrity_notes: List[str]
    delivery_summary: Dict[str, Any]
    video_summary: Dict[str, Any]
    needs_review: bool
    review_reason: Optional[str]
