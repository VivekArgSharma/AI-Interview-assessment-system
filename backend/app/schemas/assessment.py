from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    model_name: str
    model_loaded: bool
    whisper_model: str
    whisper_loaded: bool
    vad_status: str
    wav2vec_status: str
    device: str
    assessment_method: str
    total_assessments_session: int
    version: str = "0.4.0"

class RubricCriterion(BaseModel):
    id: str
    title: str
    description: str
    keywords: List[str] = []
    weight: float = 1.0

class QuestionItem(BaseModel):
    id: str
    role: str
    question: str
    reference_answer: str
    reference_concepts: List[str]
    rubric: List[RubricCriterion]

class RoleQuestions(BaseModel):
    role_id: str
    role_name: str
    description: str
    question_count: int
    questions: List[QuestionItem]

class PauseInterval(BaseModel):
    start: float
    end: float
    duration: float

class SpeechInterval(BaseModel):
    start: float
    end: float
    duration: float

class FillerWordInstance(BaseModel):
    word: str
    position_index: int
    surrounding_context: str

class FillerWordAnalysis(BaseModel):
    total_filler_count: int
    filler_counts: Dict[str, int]
    filler_words_detected: List[str]
    detected_instances: List[FillerWordInstance] = []
    detection_limitations: str = (
        "Transcript-based token matching. Whisper may automatically filter or omit minor hesitation markers ('um', 'uh'). "
        "Future audio-acoustic filler models will detect phonetic hesitations directly from the spectrogram."
    )

class AudioAnalysisResponse(BaseModel):
    total_duration_seconds: float
    speech_duration_seconds: float
    silence_duration_seconds: float
    speech_ratio: float
    pause_count: int
    average_pause_duration: float
    longest_pause_duration: float
    pauses_per_minute: float
    initial_silence_seconds: float
    trailing_silence_seconds: float
    total_words: int
    words_per_minute: float
    articulation_rate_wpm: float
    filler_words: FillerWordAnalysis
    speech_intervals: List[SpeechInterval] = []
    pause_intervals: List[PauseInterval] = []
    method: str = "silero_vad_energy_hybrid"
    vad_model: str = "Silero VAD / Energy Boundary Baseline"
    feature_notes: Dict[str, str] = {
        "pause_threshold": "Minimum pause duration >= 0.40s to filter natural micro-stops and plosive closures.",
        "speaking_rate_denominator": "Words Per Minute (WPM) computed against total audio duration; Articulation Rate computed against speech-only duration.",
        "evaluative_neutrality": "Descriptive measurements only. Pacing varies naturally across cultures and thought processes.",
        "learned_delivery_score": "Not yet available. Handcrafted features are not labeled as ML predictions. Future wav2vec 2.0 module will predict delivery score against human ratings."
    }
    wav2vec_status: str = "Optional feature extractor (Interface defined)"
    learned_delivery_score: Optional[float] = None

class AudioTranscriptionResponse(BaseModel):
    transcript: str
    language: str
    duration_seconds: float
    model_name: str
    status: str
    word_count: int
    audio_analysis: Optional[AudioAnalysisResponse] = None

class AssessRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=1000)
    answer: str = Field(..., min_length=5, max_length=10000)
    role: str = Field(..., min_length=2, max_length=100)
    question_id: Optional[str] = None
    mode: str = "text"  # "text" or "audio"
    audio_analysis: Optional[AudioAnalysisResponse] = None

class RubricCriterionResult(BaseModel):
    criterion_id: str
    title: str
    description: str
    matched: bool
    confidence: float
    evidence: Optional[str] = None

class AssessResponse(BaseModel):
    content_score: Optional[float]
    relevance_score: Optional[float]
    communication_score: Optional[float]
    overall_score: Optional[float]
    strengths: List[str]
    weaknesses: List[str]
    evidence: List[str]
    feedback: List[str]
    rubric_breakdown: List[RubricCriterionResult]
    assessment_method: str
    model_name: str
    scoring_notes: Dict[str, str]
    mode: str = "text"
    audio_analysis: Optional[AudioAnalysisResponse] = None
    unimplemented_modalities: List[str] = [
        "Audio acoustic feature extraction (speaking rate, pauses) [Implemented Phase 2]",
        "Learned Delivery Score from speech [Future: wav2vec 2.0 trained on human-rated audio]",
        "Video non-verbal feature extraction (face visibility, gaze, pose) [Future: Vision Transformer / OpenFace]",
        "Multimodal cross-attention fusion (MulT) [Future: MulT fusion model]"
    ]

class MetricsResponse(BaseModel):
    status: str
    is_synthetic: bool
    dataset_description: str
    sample_size: int
    metrics: Dict[str, Any]
    limitations: str
    planned_modalities: List[str]
