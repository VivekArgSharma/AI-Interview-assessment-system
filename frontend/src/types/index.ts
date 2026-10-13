export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  weight: number;
}

export interface QuestionItem {
  id: string;
  role: string;
  question: string;
  reference_answer: string;
  reference_concepts: string[];
  rubric: RubricCriterion[];
}

export interface RoleQuestions {
  role_id: string;
  role_name: string;
  description: string;
  question_count: number;
  questions: QuestionItem[];
}

export interface RubricCriterionResult {
  criterion_id: string;
  title: string;
  description: string;
  matched: boolean;
  confidence: number;
  evidence: string | null;
}

export interface PauseInterval {
  start: number;
  end: number;
  duration: number;
}

export interface SpeechInterval {
  start: number;
  end: number;
  duration: number;
}

export interface FillerWordInstance {
  word: string;
  position_index: number;
  surrounding_context: string;
}

export interface FillerWordAnalysis {
  total_filler_count: number;
  filler_counts: Record<string, number>;
  filler_words_detected: string[];
  detected_instances: FillerWordInstance[];
  detection_limitations: string;
}

export interface AudioAnalysisResponse {
  total_duration_seconds: number;
  speech_duration_seconds: number;
  silence_duration_seconds: number;
  speech_ratio: number;
  pause_count: number;
  average_pause_duration: number;
  longest_pause_duration: number;
  pauses_per_minute: number;
  initial_silence_seconds: number;
  trailing_silence_seconds: number;
  total_words: number;
  words_per_minute: number;
  articulation_rate_wpm: number;
  filler_words: FillerWordAnalysis;
  speech_intervals: SpeechInterval[];
  pause_intervals: PauseInterval[];
  method: string;
  vad_model: string;
  wav2vec_status: string;
  learned_delivery_score: number | null;
  feature_notes?: Record<string, string>;
}

export interface AudioTranscriptionResponse {
  transcript: string;
  language: string;
  duration_seconds: number;
  model_name: string;
  status: string;
  word_count: number;
  audio_analysis?: AudioAnalysisResponse | null;
}

export interface AssessResponse {
  content_score: number | null;
  relevance_score: number | null;
  communication_score: number | null;
  overall_score: number | null;
  strengths: string[];
  weaknesses: string[];
  evidence: string[];
  feedback: string[];
  rubric_breakdown: RubricCriterionResult[];
  assessment_method: string;
  model_name: string;
  scoring_notes: Record<string, string>;
  mode?: 'text' | 'audio';
  audio_analysis?: AudioAnalysisResponse | null;
  unimplemented_modalities: string[];
}

export interface HealthResponse {
  status: string;
  model_name: string;
  model_loaded: boolean;
  whisper_model?: string;
  whisper_loaded?: boolean;
  vad_status?: string;
  wav2vec_status?: string;
  device: string;
  assessment_method: string;
  total_assessments_session: number;
  version: string;
}

export interface MetricsResponse {
  status: string;
  is_synthetic: boolean;
  dataset_description: string;
  sample_size: number;
  metrics: {
    overall_score: {
      mae: number;
      rmse: number;
      scale: string;
    };
    content_quality: {
      mae: number;
    };
    semantic_relevance: {
      mae: number;
    };
  };
  item_breakdown?: Array<{
    id: string;
    role: string;
    question: string;
    true_overall: number;
    pred_overall: number;
    absolute_error: number;
  }>;
  limitations: string;
  planned_modalities: string[];
}

export interface SessionQuestionRecord {
  question: QuestionItem;
  answer: string;
  assessment: AssessResponse | null;
  submittedAt: string | null;
  mode: 'text' | 'audio';
  audioBlob?: Blob | null;
  audioUrl?: string | null;
  audioAnalysis?: AudioAnalysisResponse | null;
  originalTranscript?: string | null;
  isEditedTranscript?: boolean;
}

export interface InterviewSession {
  id: string;
  roleId: string;
  roleName: string;
  startedAt: string;
  completedAt: string | null;
  records: SessionQuestionRecord[];
  currentQuestionIndex: number;
}

// ==================== PRD Multi-Turn & Persistence Types ====================

export interface User {
  id: string;
  email: string;
  display_name: string;
  consent_recording: boolean;
  account_status: string;
  privacy_preferences?: Record<string, any>;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface StageInfo {
  stage_id: string;
  title: string;
  sequence: number;
  description: string;
  prompt_template: string;
  expected_concepts: string[];
}

export interface TrackRubricCriterion {
  id: string;
  criterion_key: string;
  criterion_name: string;
  description: string;
  scoring_guidance: string;
  weight: number;
  maximum_score: number;
}

export interface InterviewTrack {
  id: string;
  name: string;
  description: string;
  track_type: string;
  is_active: boolean;
  stages: StageInfo[];
  criteria: TrackRubricCriterion[];
}

export interface QuestionData {
  id: string;
  question_text: string;
  question_type: 'initial' | 'follow_up';
  sequence_number: number;
  interview_stage: string;
  context_notes?: string | null;
  expected_concepts: string[];
}

export interface InterviewSessionData {
  id: string;
  track_id: string;
  track_name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  voice_preference: string;
  status: 'created' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  current_stage?: string | null;
  current_stage_index: number;
  total_stages: number;
  current_question?: QuestionData | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface CriterionAssessmentItem {
  criterion_key: string;
  criterion_name: string;
  score: number;
  maximum_score: number;
  rationale: string;
  evidence?: string | null;
  missing_elements?: string | null;
}

export interface AnswerResponseData {
  answer_id: string;
  question_id: string;
  stage: string;
  transcript: string;
  next_action: 'follow_up' | 'next_stage' | 'completed';
  message: string;
  follow_up_question?: QuestionData | null;
  next_question?: QuestionData | null;
  stage_assessments: CriterionAssessmentItem[];
  audio_metrics?: AudioAnalysisResponse | null;
}

export interface SessionReportData {
  session_id: string;
  track_id: string;
  track_name: string;
  difficulty: string;
  duration_minutes: number;
  started_at?: string | null;
  completed_at?: string | null;
  summary: string;
  content_score: number;
  delivery_summary: Record<string, any>;
  overall_score?: number | null;
  strengths: string[];
  improvement_areas: string[];
  criteria_breakdown: Array<{
    criterion_id: string;
    criterion_key: string;
    criterion_name: string;
    score: number;
    maximum_score: number;
    weight: number;
    evidence?: string | null;
    rationale: string;
    missing_elements?: string | null;
  }>;
  qa_history: Array<{
    answer_id?: string;
    question_id: string;
    question_text: string;
    question_type: string;
    stage: string;
    transcript: string;
    audio_duration_seconds: number;
    has_audio?: boolean;
    assessments: Array<{
      criterion_name: string;
      score: number;
      evidence?: string | null;
      rationale: string;
    }>;
  }>;
  recommendations: Array<{
    criterion_id?: string | null;
    text: string;
    priority: string;
  }>;
}

export interface SessionHistoryItem {
  id: string;
  track_id: string;
  track_name: string;
  difficulty: string;
  status: string;
  content_score?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes: number;
}

export interface ProgressOverviewData {
  total_sessions: number;
  completed_sessions: number;
  total_practice_minutes: number;
  average_content_score: number;
  score_trend: Array<{
    date: string;
    score: number;
    track: string;
    difficulty: string;
  }>;
}

export interface CriterionTrendData {
  criterion_key: string;
  criterion_name: string;
  average_score: number;
  maximum_score: number;
  attempts_count: number;
  mastery_percentage: number;
}

export interface RecommendationData {
  id: string;
  criterion_id?: string | null;
  recommendation_text: string;
  priority: string;
  status: string;
}
