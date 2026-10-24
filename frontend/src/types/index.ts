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
  recommendations: string[];
  evaluation_time_seconds: number;
  model_name: string;
  rubric_results: RubricCriterionResult[];
  semantic_similarity: number | null;
  keyword_coverage_ratio: number | null;
  raw_assessment_text: string | null;
  is_fallback: boolean;
  scoring_guidance?: Record<string, any>;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds?: number;
  model_name?: string;
  model_loaded?: boolean;
  device?: string;
  assessment_method?: string;
  total_assessments_session?: number;
  whisper_available?: boolean;
  vad_available?: boolean;
  models_loaded?: {
    sentence_transformer?: boolean;
    whisper?: boolean;
    vad?: boolean;
    wav2vec?: boolean;
  };
}

export interface MetricsResponse {
  total_assessments: number;
  average_content_score: number;
  average_delivery_score: number;
  model_latency_p50: number;
  model_latency_p95: number;
  accuracy_vs_human: number;
  sample_size?: number;
  metrics?: {
    pearson_correlation?: number;
    spearman_correlation?: number;
    mean_absolute_error?: number;
    rmse?: number;
    [key: string]: any;
  };
  limitations?: string[];
  evaluation_breakdown?: any[];
  item_breakdown?: any[];
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'candidate' | 'recruiter' | 'reviewer' | 'admin';
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

export interface RubricCriterionData {
  id: string;
  criterion_key: string;
  criterion_name: string;
  description: string;
  scoring_guidance: string;
  weight: number;
  maximum_score: number;
  modality_source?: string;
}

export interface StageInfo {
  stage_id: string;
  title: string;
  sequence: number;
  description: string;
  prompt_template: string;
  expected_concepts: string[];
  followup_trigger?: string;
  followup_prompt?: string;
}

export interface InterviewTrack {
  id: string;
  name: string;
  title?: string;
  description: string;
  track_type: 'non_technical' | 'technical';
  is_active: boolean;
  stages: StageInfo[];
  criteria: RubricCriterionData[];
}

export type InterviewSession = InterviewSessionData;
export type TrackRubricCriterion = RubricCriterionData;

export interface SessionQuestionRecord {
  id?: string;
  session_id?: string;
  stage_index?: number;
  stage_name?: string;
  question_text?: string;
  question?: any;
  assessment?: any;
  audioAnalysis?: any;
  mode?: string;
  rubric_criteria?: any[];
  user_answer?: string;
  answer?: string;
  isEditedTranscript?: boolean;
  originalTranscript?: string;
  score?: number;
  feedback?: string;
  timestamp?: string;
}

export interface QuestionData {
  id: string;
  session_id: string;
  question_text: string;
  question_type: string;
  sequence_number: number;
  interview_stage: string;
  targeted_dimension?: string | null;
  context_notes?: string | null;
  expected_concepts?: string[];
  created_at: string;
}

export interface InterviewSessionData {
  id: string;
  track_id: string;
  track_name: string;
  role_id?: string | null;
  roleName?: string;
  mode?: string;
  scenario_id?: string | null;
  difficulty: string;
  duration_minutes: number;
  voice_preference: string;
  video_enabled?: boolean;
  status: 'created' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  current_stage?: string | null;
  current_stage_index: number;
  currentQuestionIndex?: number;
  records?: any[];
  total_stages: number;
  current_question?: QuestionData | null;
  needs_review?: boolean;
  review_reason?: string | null;
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
  strengths: any[];
  improvement_areas: any[];
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

// ----------------- PRISM Specific Interfaces -----------------

export interface RoleData {
  id: string;
  title: string;
  jd_text: string;
  scenario_type: string;
  duration_minutes: number;
  video_enabled: boolean;
  delivery_weight: number;
  presentation_weight: number;
  created_at: string;
}

export interface DraftRubricResult {
  job_title: string;
  scenario_type: string;
  recommended_duration_minutes: number;
  delivery_weight: number;
  dimensions: Array<{
    criterion_key: string;
    criterion_name: string;
    weight: number;
    description: string;
    modality_source: string;
  }>;
  suggested_questions: string[];
}

export interface InviteData {
  id: string;
  role_id: string;
  token: string;
  candidate_email: string | null;
  expires_at: string;
  invite_url: string;
}

export interface ScenarioItem {
  id: string;
  title: string;
  type: string;
  description: string;
  starter_code?: string;
  logs?: string;
  diff?: string;
  teammates?: Array<{ name: string; role: string; avatar: string; initial_msg: string }>;
  persona_name?: string;
  avatar?: string;
  initial_mood?: string;
  patience?: number;
  hidden_fact?: string;
  prompt?: string;
}

export interface CodeRunResult {
  scenario_id: string;
  status: string;
  passed: boolean;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
  test_details: Array<{
    test_name: string;
    passed: boolean;
    duration_ms: number;
    message: string;
  }>;
  stdout: string;
  execution_time_ms: number;
  sandboxed: boolean;
}

export interface PersonaChatResult {
  scenario_id: string;
  persona_name: string;
  reply: string;
  patience: number;
  mood: string;
  revealed_hidden_fact: boolean;
  hidden_fact_detail: string | null;
  is_resolved: boolean;
  timestamp: string;
}

export interface ContestData {
  id: string;
  session_id: string;
  dimension: string;
  timestamp_seconds: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface ReviewQueueItemData {
  session_id: string;
  candidate_name: string;
  role_title: string;
  scenario_type: string;
  overall_score: number;
  overall_ci: string;
  needs_review: boolean;
  review_reason: string | null;
  is_contested: boolean;
  contest_count: number;
  pending_contests: Array<{
    id: string;
    dimension: string;
    timestamp_seconds: number;
    reason: string;
    status: string;
  }>;
  uncertain_dimensions: string[];
  completed_at: string | null;
}

export interface RecruiterScorecardData {
  session_id: string;
  role_title: string;
  candidate_name: string;
  overall_score: number;
  overall_ci: string;
  dimensions: Array<{
    dimension: string;
    modality: string;
    value: number;
    ci_low: number;
    ci_high: number;
    std_error: number;
    ci_width: number;
    is_uncertain: boolean;
    evidence_clips: Array<{
      t_start: number;
      t_end: number;
      excerpt: string;
      reason: string;
    }>;
    counterfactual_deltas: {
      marginal_voice_contribution?: number;
      marginal_video_contribution?: number;
      marginal_text_contribution?: number;
      score_without_voice?: number;
      score_without_video?: number;
      score_without_text?: number;
    };
  }>;
  counterfactual_deltas: Record<string, any>;
  evidence_clips: Array<{
    t_start: number;
    t_end: number;
    excerpt: string;
    reason: string;
  }>;
  integrity_notes: string[];
  delivery_summary: Record<string, any>;
  video_summary: Record<string, any>;
  needs_review: boolean;
  review_reason: string | null;
  question_breakdown?: Array<{
    question_id: string;
    sequence_number: number;
    stage_name: string;
    question_type: string;
    question_text: string;
    targeted_dimension: string;
    expected_concepts: string[];
    candidate_transcript: string;
    answer_id?: string;
    audio_storage_key?: string;
    has_audio: boolean;
    audio_duration_seconds: number;
    fused_score: number;
    ci_low: number;
    ci_high: number;
    overall_ci: string;
    std_error: number;
    is_uncertain: boolean;
    text_metrics: {
      average_score: number;
      rubric_items: Array<{
        criterion_name: string;
        score: number;
        max_score: number;
        weight: number;
        evidence: string;
        rationale: string;
        missing_elements: string;
      }>;
    };
    voice_metrics: {
      speaking_rate_wpm: number;
      articulation_rate_wpm: number;
      pause_count: number;
      total_pause_duration_seconds: number;
      average_pause_sec: number;
      filler_count: number;
      status: string;
    };
    video_metrics: {
      framing_stability: number;
      gaze_at_camera_ratio: number;
      descriptive_notes: string;
    };
    counterfactual_deltas: {
      marginal_voice_contribution: number;
      marginal_video_contribution: number;
      marginal_text_contribution: number;
    };
    integrity_signals: {
      tab_blurs: number;
      pastes: number;
    };
    benchmark_exemplar: string;
  }>;
}

export interface MockQuestionData {
  id: string;
  title: string;
  track: string;
  track_label: string;
  difficulty: string;
  question_text: string;
  expected_concepts: string[];
  rubric_criteria: Array<{
    key: string;
    name: string;
    weight: number;
    description: string;
  }>;
  target_wpm_range: [number, number];
  model_exemplar: {
    title: string;
    full_text: string;
    speech_segments: Array<{
      text: string;
      pause_after_sec: number;
      emphasis_words: string[];
    }>;
    calibrated_metrics: {
      speaking_rate_wpm: number;
      articulation_rate_wpm: number;
      pause_count: number;
      average_pause_sec: number;
      filler_words_count: number;
      concept_coverage_percent: number;
      predicted_delivery_score: number;
      calibrated_ci: string;
    };
  };
}

export interface MockAssessResult {
  question_id: string;
  question_title: string;
  track: string;
  track_label: string;
  difficulty: string;
  question_text: string;
  candidate_transcript: string;
  overall_fused_score: number;
  overall_ci: string;
  overall_ci_low: number;
  overall_ci_high: number;
  std_error: number;
  is_uncertain: boolean;
  voice_metrics: {
    speaking_rate_wpm: number;
    articulation_rate_wpm: number;
    total_speech_duration_seconds: number;
    pause_count: number;
    total_pause_duration_seconds: number;
    average_pause_sec: number;
    total_filler_words: number;
    filler_counts: Record<string, number>;
  };
  video_metrics: {
    framing_stability: number;
    gaze_at_camera_ratio: number;
    head_pose_variance?: number;
    descriptive_notes: string;
  };
  concept_analysis: {
    total_expected: number;
    concepts_covered: string[];
    concepts_missed: string[];
    coverage_percentage: number;
  };
  rubric_breakdown: Array<{
    criterion_key: string;
    criterion_name: string;
    score: number;
    maximum_score: number;
    weight: number;
    matched: boolean;
    evidence: string;
    missing_elements: string;
  }>;
  counterfactual_deltas: {
    marginal_voice_contribution?: number;
    marginal_video_contribution?: number;
    marginal_text_contribution?: number;
    [key: string]: any;
  };
  pinpointed_deficits: Array<{
    category: string;
    severity: string;
    title: string;
    detail: string;
    recommendation: string;
  }>;
  actionable_drills: Array<{
    drill_type: string;
    title: string;
    instruction: string;
  }>;
  model_exemplar: MockQuestionData['model_exemplar'];
  comparison: {
    candidate: {
      overall_fused_score: number;
      confidence_interval: string;
      speaking_rate_wpm: number;
      target_wpm_range: [number, number];
      total_filler_words: number;
      concept_coverage_percent: number;
      pause_count: number;
      average_pause_sec: number;
      word_count: number;
    };
    exemplar: {
      overall_fused_score: number;
      confidence_interval: string;
      speaking_rate_wpm: number;
      total_filler_words: number;
      concept_coverage_percent: number;
      pause_count: number;
      average_pause_sec: number;
      word_count: number;
    };
  };
}

export interface AgreementEvaluationData {
  status: string;
  sample_size: number;
  human_vs_human_icc: number;
  model_vs_human_icc: number;
  icc_gap: number;
  icc_target_met: boolean;
  ece: number;
  ece_target_met: boolean;
  mae: number;
  rmse: number;
  r2_score: number;
  ablation_study: Array<{
    modality: string;
    mae: number;
    rmse: number;
    icc: number;
    ece: number;
    notes: string;
  }>;
  fairness_slices: Array<{
    subgroup: string;
    sample_count: number;
    mean_score: number;
    mae: number;
    disparity_flag: boolean;
  }>;
  candidate_report_usefulness_rating: number;
  response_gap_p50_ms: number;
  response_gap_p95_ms: number;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: Record<string, any>;
  created_at: string;
}

// ----------------- Repo & Resume Grounded Studio Types -----------------

export interface GroundedQuestionData {
  question_id: string;
  title: string;
  category: string;
  target_file: string;
  line_range: string;
  question_text: string;
  grounded_context: string;
  key_code_constructs: string[];
  source_claim?: string;
  anti_cheat_rubric: string[];
  exemplar_defense: {
    full_text: string;
    speech_segments: Array<{
      text: string;
      pause_after_sec: number;
      emphasis_words: string[];
    }>;
  };
}

export interface ResumeClaimData {
  claim_id: string;
  claim_text: string;
  verified: boolean;
  target_file: string;
  verified_ast_nodes?: string[];
  unverified_reason?: string;
  ast_correlation?: string;
  probing_question?: string;
}

export interface GroundedRepoData {
  repo_id: string;
  repo_name: string;
  primary_language: string;
  description: string;
  files: Array<{
    file_path: string;
    classes: Array<{ name: string; start_line: number; end_line: number }>;
    functions: Array<{ name: string; start_line: number; end_line: number }>;
    total_lines: number;
    patterns: Array<{ category: string; construct: string; risk_areas: string[] }>;
    code_preview: string;
  }>;
  resume_claims: ResumeClaimData[];
  grounded_questions: GroundedQuestionData[];
}

export interface RepoGroundedAssessResult {
  question_id: string;
  question_title: string;
  target_file: string;
  line_range: string;
  candidate_transcript: string;
  grounding_fidelity_score: number;
  anti_cheat_analysis: {
    ai_evasion_risk: 'Low' | 'Moderate' | 'High';
    ai_evasion_score: number;
    diagnostic_note: string;
    matched_repo_constructs: string[];
    missing_repo_constructs: string[];
  };
  architectural_defense_score: number;
  rubric_breakdown: Array<{
    criterion: string;
    score: number;
    status: string;
    weight: number;
  }>;
  pinpointed_deficits: Array<{
    type: string;
    construct: string;
    location: string;
    severity: string;
    feedback: string;
  }>;
  targeted_drills: Array<{
    title: string;
    duration: string;
    instructions: string;
  }>;
  exemplar_defense: GroundedQuestionData['exemplar_defense'];
}

