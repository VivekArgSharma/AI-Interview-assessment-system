PRD: PRISM — Explainable Multimodal Interview Assessment Platform
Working title · Draft v1 · 19 October 2026 · Owner: Vivek · Scope: BAI506 mini project and a deployable prototype
1. Summary
PRISM runs a live voice interview with an AI interviewer and scores the candidate with three specialised models (text, voice, video) whose outputs stay separate, calibrated and explainable. It produces two reports: an evidence-linked scorecard for recruiters and a concrete improvement plan for the candidate. Beyond question-and-answer, it runs scenario simulations: coding incidents with simulated teammates for tech roles, and stakeholder roleplay for non-tech roles.
Product principles
1. Show the work: every score links to timestamped evidence.
2. Never one blended number: per-dimension, per-modality scores come first.
3. Uncertain means ask or escalate: low confidence triggers a probe or a human review.
4. The candidate is a user too: they get feedback, a plan and the right to contest.
5. Privacy by default: raw media is deleted after feature extraction.
2. Users
User
Need
Key surface
Candidate
A fair interview and useful feedback
Interview room, candidate report, practice mode
Recruiter / hiring manager
Trustworthy, comparable scores with evidence
Role builder, candidate list, scorecard
Human reviewer
Resolve low-confidence and contested scores
Review queue
Admin
Users, roles, retention, audit
Admin console
3. Goals, non-goals, metrics
Goals: (1) assess candidates with explainable per-dimension scores; (2) simulate realistic work scenarios for tech and non-tech roles; (3) give actionable feedback to both sides; (4) prove score quality with an evaluation harness.
Non-goals (v1): multilingual interviews (English only); automated hire/reject decisions; personality or emotion inference; scoring video as confidence; native mobile apps; deep ATS integrations (webhook only).
Metric
Target
Model vs human rater agreement (ICC)
Within 0.1 of human-vs-human ICC
Calibration error (ECE)
< 0.08 on held-out set
Response gap, p50 / p95
< 1.5 s / < 2.5 s
Reviewer queue rate
10–20% of sessions
Candidate report rated useful
> 4 / 5
Session completion rate
> 85%
4. Differentiators
Status column: not found in Chakra’s public material as of October 2026; this is not proof of absence, so verify before claiming in the synopsis.
ID
Feature
What it does
Status vs Chakra
D1
Three-model per-modality scoring
Text, voice and video models score separately, then fuse; UI shows each
Not found; verify
D2
Counterfactual modality view
Re-scores without a modality to show its contribution
Not found
D3
Calibrated uncertainty and review queue
Score with confidence band; low confidence goes to a human
Not found
D4
Uncertainty-driven follow-ups
Scorer tells the interviewer which skill is least certain; next probe targets it
Not found
D5
Non-tech stakeholder simulation
Persona agents with hidden goals and escalation (angry customer, hesitant parent, difficult manager)
Chakra templates are tech roles
D6
Incident scenarios with simulated teammates
Logs, code and chat with on-call lead, PM and junior; scores diagnosis, communication, code
Chakra observes real repos; teammates not described
D7
Candidate improvement plan
Weak areas with evidence clips, drills, progress trend across attempts
Partly covered by mock tools
D8
Content vs delivery split
Delivery weighted by role; video optional, never labelled confidence
Not found
D9
Contestable scores
Candidate flags a moment; reviewer resolves; outcome feeds the eval set
Not found
D10
Privacy by default
Raw media deleted after features; no-video mode
Not found
D11
Anti-cheating by design
Constraint-change probes, own-work probes, consistency checks
Chakra reports flag reductions; method differs
D12
Human-agreement dashboard
Model-vs-human and human-vs-human agreement per rubric
Not found
5. Core flows
5.1 Recruiter setup. Create role, pick scenario type, edit rubric (dimensions, weights, delivery weight), set duration and video on/off, invite candidates by link or email. An LLM drafts the rubric and question plan from a job description; the recruiter approves.
5.2 Candidate session. Consent screen, mic and camera check, then a 20–45 minute session in one of three modes: Standard (resume and behavioural plus domain questions), Tech Scenario, Non-tech Simulation. Candidate can pause once, repeat a question once, and turn video off at any time.
5.3 Scoring and report. Features are extracted during the session; final scoring runs within 2 minutes of the end. The recruiter scorecard and candidate report are generated.
5.4 Review. Sessions below the confidence threshold or contested by the candidate enter the review queue with evidence clips; reviewer adjusts scores with a reason.
5.5 Practice mode. Candidates run self-practice sessions with the same engine, get the candidate report and see per-dimension trends over attempts.
6. Functional requirements
Priority: P0 must ship, P1 should ship, P2 stretch.
ID
Requirement
Pri
FR1
Auth with email magic link; roles: candidate, recruiter, reviewer, admin
P0
FR2
Recruiter creates role with rubric and scenario type; LLM drafts rubric from job description
P0
FR3
Invite links with expiry and single-use tokens
P0
FR4
Consent screen with explicit opt-in for audio, video and retention; video optional
P0
FR5
Real-time voice interview: streaming speech-to-text, LLM interviewer, text-to-speech, barge-in
P0
FR6
Question plan generation from role, rubric and (optional) candidate resume
P0
FR7
Targeted follow-up probes chosen from per-dimension uncertainty (D4)
P0
FR8
Text model scoring per rubric dimension with evidence spans
P0
FR9
Voice model scoring: pace, pauses, fluency, filler rate, prosody variation
P0
FR10
Video model features: framing stability, gaze-at-camera ratio, reported descriptively with default weight 0
P1
FR11
Fusion layer with learned per-dimension weights and modality ablation view
P0
FR12
Uncertainty estimate and calibration for every score; review queue routing
P0
FR13
Recruiter scorecard: per-dimension scores, confidence, evidence clips, modality contribution
P0
FR14
Candidate report: strengths, top 3 improvement areas, evidence, practice drills
P0
FR15
Tech Scenario S1 (failing service) with code editor, test runner and voice explanation
P0
FR16
Tech Scenarios S2 (PR review) and S3 (incident with teammates)
P1
FR17
Non-tech Simulations N1 (angry customer), N2 (hesitant parent), N3 (difficult colleague)
P0
FR18
Contest flow: candidate flags a timestamp and reason; reviewer resolves
P1
FR19
Review queue UI with side-by-side model and reviewer scores
P1
FR20
Practice mode with attempt history and per-dimension trend chart
P1
FR21
Anti-cheating probes: constraint-change, own-work and consistency questions
P1
FR22
Human-agreement dashboard (model vs human, human vs human ICC)
P1
FR23
Raw media TTL deletion (default 24 hours after scoring); transcripts and features retained per policy
P0
FR24
Data export and delete-my-data for candidates
P0
FR25
Audit log of scores, edits and access
P1
FR26
Webhook on session completed and score finalised
P2
FR27
Mock mode: every ML and LLM service has a deterministic mock so the full flow runs offline
P0
FR28
PDF export of both reports
P2
7. Scoring engine
7.1 Rubric dimensions
Group
Dimensions
Source modality
Content
Relevance, correctness and depth, structure
Text
Reasoning
Problem decomposition, trade-off awareness, prioritisation
Text (+ scenario events)
Communication
Clarity, conciseness, listening (responds to the question asked)
Text + voice
Delivery
Pace, pauses and fluency, filler rate, prosody variation
Voice
Presentation (optional)
Framing stability, gaze-at-camera ratio, descriptive only
Video
Scenario
Diagnosis quality, resolution, empathy, policy adherence (by scenario)
Scenario events + text
Each dimension is scored 1–5 with a confidence interval. Recruiters set weights; Delivery defaults to a low role-dependent weight; Presentation defaults to 0.
7.2 Three models
• Text model. Transcript from streaming Whisper (faster-whisper). Sentence-transformer or DeBERTa encoder with one regression head per content, reasoning and communication dimension, trained on human-rated answers. An LLM rubric rater provides weak labels for bootstrapping and runs as a baseline comparator, never as the final scorer. Evidence spans come from token-level attributions.
• Voice model. Whisper-encoder or wav2vec 2.0 embeddings plus prosodic features (pitch range, speech rate, pause distribution via librosa and Parselmouth; filler words from word timestamps). Small head per delivery dimension.
• Video model. MediaPipe face and pose landmarks produce descriptive features (framing stability, gaze-at-camera ratio). Optional frozen ViT or CLIP embedding for the ablation study only. Processed on-device or in a worker; frames are never stored.
7.3 Fusion, uncertainty, explainability
• Fusion: a late-fusion baseline (learned weights per dimension) and a cross-modal attention model (MulT-lite), both behind one interface so the ablation harness can swap them.
• Uncertainty: deep ensemble of 5 heads per dimension; temperature or isotonic calibration on a held-out set; report ECE. If the interval is wider than a threshold, the dimension is flagged and routed to follow-up probing (live) or the review queue (post-session).
• Counterfactual view: zero-out a modality, re-score, and display the delta per dimension.
• Evidence: each score carries 1–3 clips with start and end times and a one-line reason generated by the LLM from the attributed spans.
7.4 Report fields
Session id, role id, rubric version, model versions; per-dimension score, confidence interval, evidence clips, modality contribution deltas; overall weighted score with interval; review status; candidate improvement areas (dimension, evidence, drill); scenario event log; integrity notes (probe outcomes, not accusations).
8. Interviewer agent
Implemented as a LangGraph state machine with the LLM (Claude API behind a provider interface) used for questions, probes, persona dialogue and report narration only.
Nodes: PlanInterview → AskQuestion → Listen (VAD and streaming STT) → LiveScoreUpdate → DecideNext → (Probe | NextQuestion | Wrap-up).
State: role and rubric, question queue, transcript so far, per-dimension running score and uncertainty, probe budget, time remaining, scenario state, consent flags.
DecideNext policy
1. If time is nearly out, wrap up.
2. If a dimension has uncertainty above the threshold and probe budget remains, ask a targeted probe aimed at that dimension.
3. If the answer was shallow (low depth score), ask a depth probe (why, trade-off, edge case).
4. If an integrity probe is due, ask a constraint-change or own-work question.
5. Otherwise move to the next planned question.
Turn-taking: VAD with 600–800 ms end-of-speech threshold, barge-in cancels TTS within 150 ms, candidate can request a repeat once.
Guardrails: never ask about protected attributes; never reveal scores or the rubric weights; stay on the role scope; decline off-topic requests; log every prompt and response.
9. Scenario library
9.1 Tech scenarios
ID
Scenario
What the candidate does
Scored on
S1
Failing service
Read logs and metrics, locate the bug in a small codebase, fix it, explain aloud
Diagnosis, test pass rate, explanation clarity, trade-offs
S2
Pull request review
Review a seeded PR with planted defects, comment and decide approve or request changes
Defect recall and precision, prioritisation, tone
S3
Incident with teammates
Chat and voice with simulated on-call lead, PM and junior engineer while triaging an outage
Triage order, communication to each stakeholder, decisions under uncertainty
Infrastructure: Monaco editor in the browser, Judge0 (self-hosted) for sandboxed test runs, seeded repos and log bundles per scenario, event capture of edits, runs and messages. Teammates are persona agents (see 9.2) with limited, partially conflicting information.
9.2 Persona agent spec
Every persona is defined by: goal, mood and baseline patience, hidden facts released only when asked well, trigger rules, an escalation ladder, resolution conditions, and a hard stop for abuse.
ID
Persona
Hidden fact
Escalates when
Resolved when
N1
Angry customer, late refund
Wants an apology more than money
Candidate quotes policy without acknowledging feelings
Candidate acknowledges, explains options, agrees next step
N2
Hesitant parent, child’s course
Worried about screen time, not price
Candidate pushes enrollment
Candidate asks questions, addresses real concern
N3
Difficult colleague, missed handoff
Was never told the deadline moved
Candidate blames
Candidate finds root cause and proposes fix
Non-tech rubric: empathy, de-escalation, policy adherence, problem resolution, clarity. Each scenario ships with 6 hand-written reference transcripts (2 strong, 2 average, 2 weak) used for calibration.
10. System architecture
Components: Web app, API service, realtime media layer, interviewer agent service, scoring service (text, voice, video, fusion), scenario service (editor, runner, persona agents), review service, worker queue, storage, observability.
Layer
Choice
Frontend
Next.js and TypeScript, Tailwind, Monaco editor, Recharts, LiveKit client
API
FastAPI (Python) with Pydantic models; OpenAPI generated
Realtime
LiveKit (self-hosted) for WebRTC audio and video
STT / TTS
faster-whisper streaming; Piper or similar local TTS; provider interface for hosted alternatives
Agent orchestration
LangGraph
LLM
Claude API behind a provider interface; separate model choice per task
ML
PyTorch, Hugging Face Transformers, sentence-transformers, librosa, Parselmouth, MediaPipe
Code runner
Judge0 CE in Docker
Database
Postgres with pgvector
Queue and cache
Redis with RQ or Celery
Object storage
MinIO or S3 with lifecycle rules for TTL
Observability
OpenTelemetry, Langfuse for LLM traces, Prometheus and Grafana
Deploy
Docker Compose for dev; one GPU VM for the demo
Data flow: browser to LiveKit audio and video; audio to STT stream; transcript chunks to the agent; the agent replies via TTS; features computed on audio chunks and video frames in workers; running scores and uncertainty stored in Redis for live probing; at session end the scoring service runs final inference and writes the report.
11. Data model
• users (id, email, role, created_at)
• roles (id, recruiter_id, title, jd_text, scenario_type, duration, video_enabled, rubric_id)
• rubrics (id, version, dimensions json, weights json)
• invites (id, role_id, token_hash, expires_at, used_at)
• sessions (id, role_id, candidate_id, mode, started_at, ended_at, status, consent json)
• turns (id, session_id, speaker, text, t_start, t_end, audio_features json)
• video_features (id, session_id, t, features json)
• scenario_events (id, session_id, type, payload json, t)
• scores (id, session_id, dimension, modality, value, ci_low, ci_high, model_version)
• evidence (id, score_id, t_start, t_end, reason)
• reports (id, session_id, audience, content json, created_at)
• reviews (id, session_id, reviewer_id, dimension, original, adjusted, reason)
• contests (id, session_id, t, reason, status)
• human_ratings (id, session_id, rater_id, dimension, value) for evaluation
• audit_log (id, actor, action, target, t)
12. API surface
• POST /roles, GET /roles/{id}, POST /roles/{id}/rubric/draft
• POST /roles/{id}/invites
• POST /sessions (from invite token), POST /sessions/{id}/consent, POST /sessions/{id}/start, POST /sessions/{id}/end
• WS /sessions/{id}/stream for transcript, agent turns and live status
• POST /sessions/{id}/scenario/run (code run) and POST /sessions/{id}/scenario/chat
• GET /sessions/{id}/report?audience=recruiter|candidate
• POST /sessions/{id}/contests, GET /reviews/queue, POST /reviews/{id}/resolve
• GET /candidates/me/progress
• GET /eval/agreement
• DELETE /candidates/me/data
13. Real-time budgets
Stage
Budget
End of speech to final transcript
< 400 ms
Agent decision plus LLM first token
< 700 ms
TTS first audio
< 300 ms
Total response gap
p50 < 1.5 s, p95 < 2.5 s
Live score update (async)
< 5 s behind the conversation
Final report after session end
< 2 min
If the budget is missed, the agent uses a short natural filler turn rather than silence.
14. Anti-cheating by design
• Constraint-change probe: after a solution, change a requirement and ask the candidate to adapt it aloud.
• Own-work probe: ask why they chose a specific approach in their own code or resume project.
• Consistency check: compare explanation depth with code quality; large gaps create an integrity note.
• Environment signals: tab focus loss and paste events are logged as signals, never as automatic penalties.
• Integrity notes are shown to a human reviewer and worded as observations, not accusations.
15. Privacy, security and fairness
• Explicit consent for audio, video and retention; video can be switched off at any time with no penalty.
• Raw audio and video deleted after feature extraction (default 24 hours); frames never stored; transcripts and numeric features kept per the role’s retention setting.
• Encryption in transit and at rest; signed URLs; per-tenant access control; audit log on every report view.
• No inference of protected attributes, emotion or personality; no automated hire or reject decision.
• Fairness checks: report score distributions and error by self-reported subgroup (gender, college tier, disability accommodations) when users opt in; hold a bias review before any pilot.
• Accessibility: captions, adjustable speaking pace, extra-time option, keyboard-only flow, and a text-only fallback for candidates who cannot use voice.
16. Evaluation plan
1. Data: collect 300+ rated responses across 2 role types with at least 2 trained raters each, on a written rubric with anchor examples; consent for all participants.
2. Agreement: ICC or weighted kappa between raters, then between model and rater average.
3. Ablations: text only, voice only, video only, text+voice, all three; late fusion vs cross-modal attention; LLM-rubric baseline vs trained text model.
4. Calibration: ECE and coverage of confidence intervals; review-rate vs error trade-off curve.
5. Probing study: compare scores and score uncertainty with and without uncertainty-driven follow-ups (D4).
6. Scenario validity: correlation between scenario scores and rater judgement on the 6 reference transcripts per persona, plus test pass rates for S1.
7. Fairness slices: score gaps by subgroup where available; document limitations honestly.
8. User study: 20+ candidates rate report usefulness; 5+ recruiters rate scorecard clarity.
17. Milestones
Phase
Weeks
Deliverable
0
1
Repo, Docker Compose, schemas, mock services, auth, role builder
1
2–3
Voice interview loop with streaming STT, TTS, LangGraph agent, transcripts
2
3–4
Text and voice scoring (baseline models), scorecard, candidate report
3
5–6
S1 tech scenario, N1 persona simulation, uncertainty and probing
4
6–7
Video features, fusion, ablation harness, counterfactual view
5
7–8
Review queue, contest flow, privacy TTL, practice mode and progress
6
9–10
Data collection, training, evaluation, fairness slices, write-up
18. Instructions for the building agent
Build in the order below. Each step must run end to end with mock services before real models are added.
1. Repo layout: /apps/web (Next.js), /services/api (FastAPI), /services/agent (LangGraph), /services/scoring (models and fusion), /services/scenario (runner and personas), /ml (training and eval scripts), /infra (Docker Compose, LiveKit, Judge0, MinIO), /docs.
2. Interfaces first: define STTProvider, TTSProvider, LLMProvider, TextScorer, VoiceScorer, VideoScorer, Fusion, PersonaAgent as abstract interfaces with a deterministic mock and a real implementation each. A config flag selects mock or real.
3. Schemas: generate Pydantic and SQL migrations from Section 11; generate the OpenAPI spec from Section 12 and a typed TypeScript client.
4. Vertical slice: recruiter creates role, invite link, candidate session with mock voice, mock scores, both reports rendered. Add Playwright tests for this flow.
5. Real voice loop: LiveKit, streaming STT, LLM interviewer, TTS, barge-in; measure the latency budget and log it.
6. Scoring: implement feature extraction for text and voice, train baseline heads on a small synthetic and hand-labelled seed set, wire calibration and the ensemble, and expose evidence spans.
7. Scenarios: S1 with Judge0 and seeded repo, N1 persona with the Section 9.2 spec and reference transcripts; then N2, N3, S2, S3.
8. Uncertainty probing: connect per-dimension uncertainty to the DecideNext policy; test with scripted candidate transcripts.
9. Video and fusion: MediaPipe features, late fusion, cross-modal model, ablation script that outputs a results table.
10. Review, contest, privacy: review queue, contest flow, TTL deletion job, export and delete endpoints, audit log.
11. Evaluation harness: scripts that read human_ratings and output ICC, ECE, ablation and subgroup tables as Markdown.
Conventions: typed Python (mypy clean), ruff and black, TypeScript strict, 80% test coverage on scoring and agent logic, structured JSON logs, no secrets in the repo, .env.example provided, every feature behind a flag in config.
Definition of done: docker compose up brings the whole system up in mock mode; the Playwright suite passes; a seeded demo shows a full tech session and a full non-tech session with both reports; the evaluation script runs on the seed data and prints tables; README documents setup, architecture and how to swap mock for real providers.
19. Risks and open questions
Risk
Mitigation
Too little rated data to train fusion models
Freeze encoders, train small heads, keep the late-fusion baseline, report ablations honestly
Label noise from rater disagreement
Anchor examples, rater training, report ICC, model the disagreement as uncertainty
Voice latency feels unnatural
Streaming everywhere, filler turns, small fast model for turn-taking
Persona agents drift or break character
Strict persona prompts, hidden-state tracking, reference-transcript regression tests
Video features introduce bias
Optional, descriptive only, default weight 0, subgroup reporting
Privacy incident
TTL deletion, minimal retention, encryption, no frame storage
Over-claiming novelty
Verify each D-row against vendor docs and trials before publication
Open questions: which two role types to evaluate first; whether to start with a hosted STT and TTS for speed of development; how many trained raters are available; whether reviewers are faculty or peers.