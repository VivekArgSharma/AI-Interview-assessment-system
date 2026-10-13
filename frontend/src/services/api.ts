import {
  HealthResponse,
  RoleQuestions,
  AssessResponse,
  MetricsResponse,
  AudioTranscriptionResponse,
  AudioAnalysisResponse,
  User,
  AuthResponse,
  InterviewTrack,
  TrackRubricCriterion,
  InterviewSessionData,
  QuestionData,
  AnswerResponseData,
  SessionReportData,
  SessionHistoryItem,
  ProgressOverviewData,
  CriterionTrendData,
  RecommendationData,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiService {
  private static TOKEN_KEY = 'interview_auth_token';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private static getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ==================== Health & System ====================

  static async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  }

  static async getMetrics(): Promise<MetricsResponse> {
    const res = await fetch(`${API_BASE_URL}/metrics`);
    if (!res.ok) {
      throw new Error(`Failed to load model metrics (${res.status})`);
    }
    return res.json();
  }

  // ==================== Authentication ====================

  static async register(data: { email: string; password: string; display_name: string; consent_recording?: boolean }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Registration failed');
    }
    const result: AuthResponse = await res.json();
    this.setToken(result.access_token);
    return result;
  }

  static async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Invalid email or password');
    }
    const result: AuthResponse = await res.json();
    this.setToken(result.access_token);
    return result;
  }

  static logout(): void {
    this.removeToken();
  }

  static async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to retrieve user profile');
    }
    return res.json();
  }

  static async updateProfile(data: { display_name?: string; consent_recording?: boolean }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to update profile');
    }
    return res.json();
  }

  static async deleteAccount(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to delete account');
    }
    this.removeToken();
  }

  // ==================== Tracks & Rubrics ====================

  static async getTracks(): Promise<InterviewTrack[]> {
    const res = await fetch(`${API_BASE_URL}/interview-tracks`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load interview tracks (${res.status})`);
    }
    return res.json();
  }

  static async getTrackRubric(trackId: string): Promise<TrackRubricCriterion[]> {
    const res = await fetch(`${API_BASE_URL}/interview-tracks/${trackId}/rubric`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load rubric for track ${trackId}`);
    }
    return res.json();
  }

  // ==================== Interview Sessions ====================

  static async createSession(data: {
    track_id: string;
    difficulty: string;
    duration_minutes: number;
    voice_preference?: string;
  }): Promise<InterviewSessionData> {
    const res = await fetch(`${API_BASE_URL}/interviews`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Failed to create interview session');
    }
    return res.json();
  }

  static async getSession(sessionId: string): Promise<InterviewSessionData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to retrieve interview session');
    }
    return res.json();
  }

  static async startSession(sessionId: string): Promise<InterviewSessionData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to start interview session');
    }
    return res.json();
  }

  static async pauseSession(sessionId: string): Promise<InterviewSessionData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/pause`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to pause interview session');
    }
    return res.json();
  }

  static async resumeSession(sessionId: string): Promise<InterviewSessionData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/resume`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to resume interview session');
    }
    return res.json();
  }

  static async endSession(sessionId: string): Promise<{ message: string; session_id: string; report_id: string }> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to end interview session');
    }
    return res.json();
  }

  static async getCurrentQuestion(sessionId: string): Promise<QuestionData | null> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/current-question`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  }

  static async submitAnswerText(
    sessionId: string,
    questionId: string,
    transcript: string,
    isEdited: boolean = false
  ): Promise<AnswerResponseData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/answers`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        question_id: questionId,
        transcript,
        is_edited: isEdited,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Failed to submit answer');
    }
    return res.json();
  }

  static async submitAnswerAudio(
    sessionId: string,
    questionId: string,
    audioBlob: Blob,
    editedTranscript?: string,
    filename: string = 'recording.wav'
  ): Promise<AnswerResponseData> {
    const formData = new FormData();
    formData.append('question_id', questionId);
    formData.append('file', audioBlob, filename);
    if (editedTranscript) {
      formData.append('edited_transcript', editedTranscript);
    }

    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/answers/audio`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Failed to process spoken answer');
    }
    return res.json();
  }

  static async getSessionReport(sessionId: string): Promise<SessionReportData> {
    const res = await fetch(`${API_BASE_URL}/interviews/${sessionId}/report`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load session report');
    }
    return res.json();
  }

  static async getHistory(): Promise<SessionHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/interviews/history`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load session history');
    }
    return res.json();
  }

  // ==================== Progress & Analytics ====================

  static async getProgressOverview(): Promise<ProgressOverviewData> {
    const res = await fetch(`${API_BASE_URL}/progress/overview`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load progress overview');
    }
    return res.json();
  }

  static async getCriteriaTrends(): Promise<CriterionTrendData[]> {
    const res = await fetch(`${API_BASE_URL}/progress/criteria`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load criteria trends');
    }
    return res.json();
  }

  static async getRecommendations(): Promise<RecommendationData[]> {
    const res = await fetch(`${API_BASE_URL}/progress/recommendations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load recommendations');
    }
    return res.json();
  }

  // ==================== Legacy Single-Question Methods ====================

  static async getQuestions(): Promise<Record<string, RoleQuestions>> {
    const res = await fetch(`${API_BASE_URL}/questions`);
    if (!res.ok) {
      throw new Error(`Failed to load interview questions (${res.status})`);
    }
    return res.json();
  }

  static async transcribeAudio(
    audioBlob: Blob,
    filename: string = 'recording.wav'
  ): Promise<AudioTranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);

    const res = await fetch(`${API_BASE_URL}/audio/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Transcription failed with status ${res.status}`);
    }
    return res.json();
  }

  static async analyzeAudio(
    audioBlob: Blob,
    transcript?: string,
    filename: string = 'recording.wav'
  ): Promise<AudioAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    if (transcript) {
      formData.append('transcript', transcript);
    }

    const res = await fetch(`${API_BASE_URL}/audio/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Audio analysis failed with status ${res.status}`);
    }
    return res.json();
  }

  static async assessResponse(
    question: string,
    answer: string,
    role: string,
    questionId?: string,
    mode: 'text' | 'audio' = 'text',
    audioAnalysis?: AudioAnalysisResponse | null
  ): Promise<AssessResponse> {
    const res = await fetch(`${API_BASE_URL}/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        answer,
        role,
        question_id: questionId,
        mode,
        audio_analysis: audioAnalysis,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Assessment request failed with status ${res.status}`);
    }
    return res.json();
  }
}
