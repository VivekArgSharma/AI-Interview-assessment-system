# Multimodal AI-Based Interview Performance Assessment System

> **Version:** 1.0 (Full PRD Implementation)  
> **Interaction Mode:** Real-time Spoken AI Voice Interview with Multi-turn Adaptive Progression  
> **Initial Tracks:** Sales Interview and Software Engineering Bug-Fixing Interview

---

## 1. System Overview

The **Multimodal AI-Based Interview Performance Assessment System** is a complete full-stack web platform implementing the requirements specified in [`prd.md`](./prd.md). It simulates realistic spoken job interviews with an AI interviewer who speaks questions using Text-to-Speech (TTS), records the candidate's verbal answers, transcribes speech locally using OpenAI Whisper, extracts acoustic speech features (VAD, speaking rate, pauses, and filler words), generates contextual adaptive follow-up questions, and produces evidence-grounded reports.

### Key Differentiators & Principles
1. **Decoupled Assessment Dimensions:**
   - **Content Quality Score (0–100%):** Evaluated strictly against structured track rubrics using dense Sentence-BERT semantic matching and exact verbatim transcript evidence quotes.
   - **Speech Delivery Metrics:** Acoustic measurements (Words Per Minute, Articulation Rate, Pause duration, and Filler words) are reported descriptively and held strictly distinct from subjective grades.
2. **Turn-Based Conversational Flow:**
   - Pre-configured multi-stage scenarios for **Sales** (5 stages) and **Software Engineering Bug-Fixing** (6 stages).
   - Adaptive follow-up generator: Probes deeper into ambiguous answers, missed discovery, or untested hypotheses before progressing.
3. **Evidence Grounding:**
   - Every rubric criterion score (0–4 scale) is accompanied by verbatim quotes extracted directly from the candidate's transcript to eliminate hallucinated assertions.
4. **Longitudinal Progress Tracking:**
   - Tracks practice performance across sessions, criterion mastery progression, and detects recurring gaps to recommend focus drills.
5. **Privacy & Offline First:**
   - Runs locally without requiring external cloud speech/LLM APIs. Whisper and Sentence-BERT run in PyTorch on CPU/GPU.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Restrained dark/navy professional SaaS theme matching PRD §7)
- **Voice & Speech:** HTML5 `MediaRecorder` API + Web Audio API volume visualizer + Web Speech API (`SpeechSynthesis`)
- **Analytics & Visualizations:** Recharts (score progression line charts and criteria mastery)
- **Icons:** Lucide React

### Backend & AI Architecture
- **API:** FastAPI + Pydantic v2 + Uvicorn
- **Database & Persistence:** SQLAlchemy 2.0 + SQLite (default zero-config) / PostgreSQL
- **Speech-to-Text:** `openai-whisper` (`tiny` / `base` running locally)
- **Audio Processing:** `soundfile` + `scipy.signal` (resampling to 16kHz mono)
- **Voice Activity Detection:** Adaptive Short-Time Energy VAD + pause segmenter ($\ge 0.40$s)
- **Embeddings & Rubrics:** `sentence-transformers/all-MiniLM-L6-v2`
- **Testing:** PyTest (22 integration and unit tests passing)

---

## 3. Interview Tracks & Conversational Stages

### Track 1: Non-Technical Sales Interview
- **Stage 1: Customer Discovery:** Probing open-ended questions, budget, and business drivers.
- **Stage 2: Understanding Needs:** Quantifying pain points, workflow hours, and executive impact.
- **Stage 3: Value Proposition:** Connecting product benefits directly to quantified business ROI.
- **Stage 4: Objection Handling:** Handling competitor 20% lower price objections without premature discounting.
- **Stage 5: Closing & Next Steps:** Securing concrete commitments and a mutual action plan.

### Track 2: Technical Software Engineering Bug-Fixing
- **Stage 1: Understand the Problem:** Clarifying API duplicate records vs. database uniqueness.
- **Stage 2: Form Hypotheses:** Brainstorming SQL table joins, worker retries, concurrency, and caching.
- **Stage 3: Diagnostic Steps:** Query profiling, isolation tests, and request lifecycle breakpoints.
- **Stage 4: Root Cause Reasoning:** Identifying non-idempotent retry loops appending to mutable state.
- **Stage 5: Proposed Fix:** Designing idempotent execution, deduplication sets, and proper timeout handling.
- **Stage 6: Regression Testing:** Automated unit/integration tests simulating timeout retries and monitoring.

---

## 4. API Endpoints (`/api/v1`)

| Group | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | GET | `/api/v1/health` | Service & AI model readiness status |
| **Auth** | POST | `/api/v1/auth/register` | Register new candidate account |
| **Auth** | POST | `/api/v1/auth/login` | Authenticate and obtain JWT token |
| **Auth** | GET | `/api/v1/users/me` | Retrieve profile and recording consent |
| **Tracks** | GET | `/api/v1/interview-tracks` | List Sales and Bug-Fixing tracks & stages |
| **Tracks** | GET | `/api/v1/interview-tracks/{id}/rubric` | Retrieve rubric criteria definitions |
| **Session** | POST | `/api/v1/interviews` | Create session with track, difficulty, duration |
| **Session** | POST | `/api/v1/interviews/{id}/start` | Start session and fetch stage 1 question |
| **Session** | GET | `/api/v1/interviews/{id}/current-question` | Retrieve active question and stage |
| **Session** | POST | `/api/v1/interviews/{id}/answers` | Submit text answer & receive follow-up / next stage |
| **Session** | POST | `/api/v1/interviews/{id}/answers/audio` | Submit spoken audio recording & speech metrics |
| **Session** | POST | `/api/v1/interviews/{id}/pause` & `/resume` | Pause / resume session |
| **Session** | POST | `/api/v1/interviews/{id}/end` | Conclude session and generate final report |
| **Reports** | GET | `/api/v1/interviews/{id}/report` | Retrieve final comprehensive session report |
| **History** | GET | `/api/v1/interviews/history` | Retrieve past session attempts |
| **Progress**| GET | `/api/v1/progress/overview` | Overall performance metrics and score trend |
| **Progress**| GET | `/api/v1/progress/criteria` | Longitudinal criterion mastery breakdown |
| **Progress**| GET | `/api/v1/progress/recommendations` | Active prioritized practice drill recommendations |

---

## 5. Running the Application Locally

### 1. Start the Backend API Server
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger): `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/v1/health`

### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
- Open `http://localhost:5173` in your browser.

### 3. Run Automated Tests
```bash
cd backend
pytest tests/
```
All 22 automated integration and unit tests will run and validate authentication, track progression, audio feature extraction, and report generation.
