# Product Requirements Document (PRD)
## Multimodal AI-Based Interview Performance Assessment System

**Product type:** AI-powered interview practice, assessment, and coaching platform  
**Version:** 1.0  
**Status:** Product specification for implementation  
**Primary interfaces:** Web application and backend API  
**Interaction mode:** Real-time voice-based interview  
**Initial interview tracks:** Sales and Software Engineering Bug-Fixing  
**Video features:** Out of scope

---

# 1. Executive Summary

The Multimodal AI-Based Interview Performance Assessment System is a web platform that simulates realistic job interviews using an AI interviewer. Candidates participate in spoken interviews, answer questions verbally, and receive structured feedback on their answer quality, communication, and areas for improvement.

Unlike a basic chatbot that asks questions and produces a generic summary, the system evaluates each response across separate dimensions.

1. **Answer quality:** How well the response addresses the question.
2. **Content and reasoning:** Whether the candidate covers relevant concepts, requirements, or rubric criteria.
3. **Speech delivery:** Speaking rate, pauses, potential filler words, and other measurable audio characteristics.
4. **Evidence-based feedback:** Which parts of the response support the assessment.
5. **Improvement tracking:** How performance changes across multiple practice sessions.

The product will initially support two interview experiences:

- **Sales interview:** Evaluates discovery questions, communication, objection handling, value proposition, and closing strategy.
- **Technical bug-fixing interview:** Presents a software bug, asks the candidate to investigate it verbally, and evaluates debugging reasoning, hypothesis formation, test selection, and proposed fixes.

The system will use speech recognition, language models, text embeddings, audio processing, rubric-based assessment, and a structured feedback engine.

A real-time voice interface will let the candidate hear the interviewer, respond naturally, and interact through spoken follow-up questions.

## 1.1 Product vision

Build a practical AI interview coach that helps candidates understand not just whether an answer was strong, but **why it was strong, what was missing, and how to improve the next attempt**.

## 1.2 Product goals

- Simulate interactive voice interviews.
- Provide structured, repeatable assessments.
- Explain evaluations using evidence from the candidate's response.
- Separate content performance from speech-delivery metrics.
- Support sales and technical bug-fixing interviews.
- Adapt follow-up questions to the candidate's answers.
- Track progress over multiple practice sessions.
- Create a maintainable architecture that can support future assessment models.

---

# 2. Target Users and Stakeholders

## 2.1 Candidates and students

Candidates use the platform to prepare for placements, internships, and job interviews.

**Needs:**
- Practise without requiring a human interviewer.
- Experience spoken interviews rather than static questionnaires.
- Understand what was missing in their answers.
- Receive specific suggestions instead of generic advice.
- Track progress over time.

## 2.2 Recruiters and interviewers

Recruiters may use the platform as an assessment aid or to help standardize practice exercises.

**Needs:**
- Consistent evaluation rubrics.
- Clear evidence supporting each assessment.
- Structured reports.
- A way to review uncertain or incomplete evaluations.

The initial product is primarily candidate-facing. Recruiter dashboards and organization-level administration can be added later.

## 2.3 College placement cells

Placement cells can use the platform to help students prepare for technical and non-technical interviews.

**Needs:**
- Repeatable practice exercises.
- Progress summaries.
- Identification of recurring skill gaps.
- Scalable interview practice without scheduling individual mock interviews.

## 2.4 Product administrators

Administrators maintain the application, manage interview templates, configure scoring rubrics, and monitor reliability.

---

# 3. Scope and Feature Boundaries

## 3.1 Included in Version 1

- User registration and authentication.
- Candidate profile and interview preferences.
- Sales interview track.
- Software engineering bug-fixing interview track.
- Real-time spoken interview interaction.
- AI interviewer with contextual follow-up questions.
- Speech-to-text transcription.
- Audio recording and playback.
- Answer-content assessment.
- Speech-delivery analysis.
- Evidence-linked feedback.
- Session report and score breakdown.
- Interview history.
- Progress tracking.
- Interview configuration and difficulty settings.
- Backend API, database, AI services, monitoring, and deployment.
- Responsive web interface.

## 3.2 Explicitly excluded

- Video recording or video analysis.
- Facial-expression analysis.
- Eye-contact detection.
- Emotion detection from facial expressions.
- Body-language assessment.
- Resume parsing and job matching.
- Live interviews between two human participants.
- Automated hiring or rejection decisions.
- Enterprise applicant-tracking-system integrations.
- Organization billing and advanced multi-tenant administration.
- Fully autonomous execution of candidate-submitted code.

The technical interview will evaluate bug-fixing reasoning through spoken interaction and the supplied problem context. Executing arbitrary code in a secure sandbox is a separate capability and is not required for the first release.

---

# 4. Product Scenarios and User Journeys

The product will have two main scenarios.

## 4.1 Scenario A: Non-technical sales interview

**Scenario:** A candidate is preparing for a sales role and wants to practise a customer-discovery and objection-handling conversation.

### Example interview

**AI interviewer:**

"You are speaking with a potential customer who is interested in your product but believes it is too expensive. How would you handle the conversation?"

**Candidate:**

"I would explain the benefits of the product and try to show how it can save them money over time."

**AI interviewer follow-up:**

"Before explaining the benefits, what would you ask the customer to understand why they feel the price is too high?"

**Candidate:**

"I would ask what budget they have and what alternatives they are considering."

**AI interviewer follow-up:**

"Suppose the customer says a competitor offers a similar product for 20% less. How would you respond without immediately offering a discount?"

The interview continues based on the candidate's answers.

### What the system evaluates

- Customer discovery.
- Understanding customer needs.
- Value proposition.
- Handling objections.
- Logical sales conversation.
- Clarity and relevance.
- Potential filler words, pauses, and speaking rate.

### Example feedback

**Strength:** The candidate identifies product benefits and considers the customer's budget.

**Improvement area:** The candidate begins defending the product before fully understanding the customer's objection.

**Suggested improvement:** Ask an open-ended discovery question first, such as what the customer is comparing and which outcome matters most.

**Evidence:** The candidate's answer mentions explaining benefits and saving money, but does not initially identify a discovery question.

The system should evaluate the candidate's response against a sales rubric, not against a single mandatory reference sentence. Multiple valid sales strategies must be accepted.

## 4.2 Scenario B: Technical software engineering bug-fixing interview

**Scenario:** A candidate interviews for a software engineering role. The AI interviewer describes a bug and evaluates the candidate's debugging approach.

### Example interview

**AI interviewer:**

"A service has started returning duplicate records after a recent deployment. The database contains unique records, but the API response sometimes contains duplicates. How would you investigate this?"

**Candidate:**

"I would check the database query, see if there are duplicate rows, and inspect the API code."

**AI interviewer follow-up:**

"The database has no duplicate rows. What would you inspect next?"

**Candidate:**

"I would check whether the API joins multiple tables or whether the application is appending the same results more than once."

**AI interviewer follow-up:**

"You discover that a retry mechanism sometimes appends the same page of results twice. How would you fix the bug, and how would you test your fix?"

### What the system evaluates

- Problem decomposition.
- Hypothesis formation.
- Debugging strategy.
- Selection of relevant tests.
- Root-cause reasoning.
- Proposed fix.
- Regression prevention.
- Clarity of explanation.
- Speech-delivery characteristics.

### Example feedback

**Strength:** The candidate considers application-level duplication and joins after ruling out duplicate database records.

**Missing criterion:** The candidate should explicitly verify whether retries are idempotent and whether the same page is being appended twice.

**Suggested improvement:** Reproduce the failure, inspect retry logs, add a regression test for repeated pages, and ensure retries do not duplicate results.

**Evidence:** The candidate mentions joins and repeated appending, which are relevant hypotheses. The assessment should distinguish the correct diagnostic direction from the still-unverified root cause.

Technical evaluation must consider the entire debugging context. It should not penalize a candidate for exploring multiple plausible hypotheses before enough evidence is available.

## 4.3 Shared scenario: Interview improvement

After several practice sessions, the candidate views a progress report showing:

- Rubric criteria consistently covered.
- Criteria frequently missed.
- Changes in answer relevance.
- Changes in speaking rate and pause patterns.
- Previous feedback and completed practice goals.

Progress should be measured only when the sessions are reasonably comparable. A harder interview should not automatically be treated as a decline in ability.

---

# 5. Functional Requirements

## 5.1 Authentication and user management

The platform must support:

- Registration using email and password.
- Login and logout.
- Secure password hashing.
- Session or token-based authentication.
- Password reset.
- Profile management.
- Account deletion.
- Consent for recording and AI processing.
- Access control so users can only access their own sessions.

OAuth login may be added as an optional extension.

## 5.2 Candidate dashboard

The dashboard should provide:

- A welcome section.
- Start Interview action.
- Sales Interview and Bug-Fixing Interview cards.
- Recent interview sessions.
- Last session summary.
- Performance trends.
- Recommended practice goals.
- Interview history.
- Account and privacy settings.

The dashboard should emphasize the next useful action rather than displaying numerous decorative statistics.

## 5.3 Interview setup

Before an interview, the user selects:

- Interview track.
- Difficulty.
- Target role or interview context.
- Interview duration.
- Spoken language, where supported.
- Voice preference.
- Whether to receive coaching feedback after each answer or only at the end.

Recommended difficulty levels:

- Beginner.
- Intermediate.
- Advanced.

Recommended duration options:

- 5 minutes.
- 10 minutes.
- 20 minutes.

The system must show microphone permissions, recording status, and relevant data-processing information before the session begins.

## 5.4 Real-time voice interviewer

The interview experience is the core product feature.

### Required behaviour

1. The system presents a spoken question.
2. The candidate hears the question through text-to-speech.
3. The candidate responds through their microphone.
4. The interface shows microphone status and recording progress.
5. Speech is converted into text.
6. The system evaluates the answer.
7. The interviewer generates a contextual follow-up or moves to the next question.
8. The process repeats until the interview ends.
9. The candidate receives a final report.

### Voice interaction controls

- Start interview.
- Pause interview.
- Resume interview.
- Repeat question.
- Stop speaking.
- End interview.
- Retry recording.
- Review recognized transcript.
- Continue after a processing delay.
- Handle microphone permission errors.

The system must never silently submit an incomplete or unintended answer.

### Conversation state

The backend should track:

- Current question.
- Current interview stage.
- Previous questions and answers.
- Rubric criteria already assessed.
- Missing criteria.
- Follow-up count.
- Remaining time.
- Current session status.

The interviewer should avoid asking the same question repeatedly unless clarification is necessary.

### Real-time implementation approach

For the initial release, use turn-based voice interaction with low-latency processing rather than attempting fully simultaneous, unrestricted human-like conversation.

A practical pipeline is:

**AI question → text-to-speech → candidate speaks → speech recognition → assessment → follow-up generation → next question.**

The architecture should permit streaming transcription and faster speech responses as a later optimization.

## 5.5 Interview question engine

The question engine manages the interview structure.

It should support:

- Question templates.
- Role-specific rubrics.
- Difficulty levels.
- Follow-up questions.
- Interview stage progression.
- Question history.
- Maximum follow-up count.
- End-of-interview conditions.

### Sales interview stages

1. Customer discovery.
2. Understanding needs.
3. Value proposition.
4. Objection handling.
5. Closing or next-step strategy.

### Bug-fixing interview stages

1. Understand the problem.
2. Form hypotheses.
3. Choose diagnostic steps.
4. Identify likely root cause.
5. Propose a fix.
6. Define regression tests.

These stages guide the conversation rather than forcing every interview into an identical sequence.

## 5.6 Speech-to-text transcription

The system converts spoken answers into transcripts using an automatic speech recognition service.

Requirements:

- Transcribe each response.
- Preserve question and answer associations.
- Store timestamps when available.
- Support correction or retry when transcription fails.
- Mark low-confidence transcription where the underlying model exposes confidence information.
- Allow transcript review.
- Avoid treating transcription uncertainty as candidate incompetence.

**Initial model:** Whisper or a suitable compatible speech-recognition implementation.

The backend should expose a provider interface so the speech-recognition model can be replaced without rewriting the interview engine.

## 5.7 Audio analysis

The audio pipeline extracts measurable characteristics from candidate recordings.

### Initial features

- Speech duration.
- Estimated speaking rate.
- Number and duration of detected pauses.
- Potential filler-word frequency.
- Long-pause frequency.
- Speech activity intervals.
- Audio quality and processing errors.

Use voice activity detection to distinguish speech from silence.

Potential filler words may include "um", "uh", and other supported language-specific forms.

### Important constraints

- A pause is not automatically a mistake.
- Speaking slowly is not automatically poor communication.
- Accents and language differences must not be treated as deficiencies.
- Filler-word detection can be inaccurate, especially in noisy recordings.
- Delivery metrics should be contextualized rather than used as absolute measures of confidence or competence.

The initial product must not infer personality, honesty, intelligence, or emotional state from voice characteristics.

## 5.8 Answer-content assessment

The system evaluates the candidate's answer against a structured rubric.

### Sales rubric

| Criterion | What is assessed |
|---|---|
| Discovery | Identifies questions that reveal customer needs |
| Listening and understanding | Addresses the customer's stated concern |
| Value proposition | Connects benefits to customer outcomes |
| Objection handling | Responds constructively to concerns |
| Reasoning | Explains a coherent approach |
| Next steps | Identifies a suitable continuation or close |

### Bug-fixing rubric

| Criterion | What is assessed |
|---|---|
| Problem understanding | Clarifies symptoms and constraints |
| Hypothesis formation | Identifies plausible causes |
| Diagnostic approach | Proposes relevant investigation steps |
| Root-cause reasoning | Uses evidence to narrow down causes |
| Proposed fix | Suggests an appropriate corrective action |
| Testing | Includes regression and relevant edge-case tests |

Each criterion should have a description, score range, scoring guidance, and evidence requirements.

The system should accept alternative valid answers. Reference answers are guidance, not exact strings candidates must reproduce.

## 5.9 Separate content and delivery scores

The platform must maintain separate assessment dimensions.

**Content assessment**
- Relevance.
- Rubric coverage.
- Reasoning quality.
- Correctness where the question permits reliable verification.

**Delivery assessment**
- Speaking rate.
- Pause patterns.
- Potential filler words.
- Audio clarity where measurable.

These scores must not be collapsed into a single number without an explicit, validated scoring policy.

If an overall score is displayed, the weighting must be visible and configurable. The report should still preserve each individual dimension.

## 5.10 Evidence-linked feedback

Every important assessment should include:

- Criterion assessed.
- Score or qualitative rating.
- Evidence from the transcript.
- Explanation of why the evidence matters.
- Missing or weak elements.
- Actionable improvement suggestion.
- Confidence or uncertainty indicator when available.

For example:

**Criterion:** Diagnostic approach

**Evidence:** "I would inspect the API joins and check whether the application appends results twice."

**Assessment:** Relevant diagnostic hypotheses were identified.

**Next improvement:** Explain how you would reproduce the issue and distinguish between the competing hypotheses.

Evidence must come from the actual answer. The model must not fabricate transcript quotations or claim that an unmentioned action was performed.

## 5.11 Adaptive follow-up questions

The AI interviewer should choose follow-ups based on:

- The current interview stage.
- The candidate's latest response.
- Criteria already covered.
- Unresolved ambiguity.
- The remaining interview time.

Examples:

- Sales: Ask a discovery question if the candidate jumps directly to a discount.
- Bug-fixing: Ask for a test strategy if the candidate proposes a fix without explaining verification.

The model must not reveal the expected answer prematurely during an assessment interview.

## 5.12 Final interview report

After an interview, the user receives a report containing:

1. Interview summary.
2. Overall performance overview, if a valid aggregation is configured.
3. Content assessment.
4. Delivery metrics.
5. Rubric-by-rubric breakdown.
6. Strengths.
7. Improvement areas.
8. Evidence from individual responses.
9. Suggested model answers or response structures.
10. Recommended next practice goals.
11. Transcript and question history.
12. Processing limitations and uncertain assessments.

Reports should distinguish model-generated judgments from directly measured audio features.

## 5.13 Progress tracking

The system stores results across practice sessions.

Features include:

- Session history.
- Performance trends.
- Rubric-specific progress.
- Recurring content gaps.
- Delivery metric trends.
- Previously recommended goals.
- Comparison between comparable practice sessions.

The system may recommend the next exercise based on recurring weaknesses.

For example, if the candidate repeatedly proposes fixes without describing regression tests, the next bug-fixing practice may focus on testing strategy.

Progress charts must not imply statistically significant improvement when the number of sessions is too small.

## 5.14 Interview session controls and recovery

The platform must support:

- Graceful recovery from speech-recognition failures.
- Retry after network interruptions.
- Clear processing indicators.
- Recovery from temporary AI provider failures.
- Saving completed answers incrementally.
- Ending an interview early.
- Generating a partial report when possible.
- Distinguishing an abandoned session from a completed one.

---

# 6. AI and Technical Architecture

## 6.1 Recommended technology stack

### Frontend

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- A reusable accessible component system.
- Web Audio API and MediaRecorder.
- Browser speech synthesis for the initial text-to-speech implementation.

### Backend

- Python.
- FastAPI.
- Pydantic for request and response validation.
- SQLAlchemy or an equivalent database layer.
- Alembic for database migrations.
- Background processing for long-running tasks where needed.

### Database and storage

- PostgreSQL for application data.
- Object storage for audio recordings when retention is enabled.
- Redis and a job queue only when asynchronous workloads justify them.

### AI components

- Whisper or a compatible speech-recognition provider.
- Sentence-BERT, such as `all-MiniLM-L6-v2`, for semantic similarity and retrieval.
- A language model for question generation, follow-ups, and rubric-based assessment.
- Voice activity detection for speech and pause measurements.
- Text-to-speech provider or browser speech synthesis.

Sentence embeddings are useful for measuring semantic relationships but are not sufficient to establish factual or technical correctness. Correctness should be evaluated using explicit rubric criteria, domain checks where available, and model judgments with appropriate safeguards.

### Deployment

- Frontend: Vercel or equivalent static hosting.
- Backend: a Python-compatible application host or cloud VM.
- Database: managed PostgreSQL or a properly secured self-hosted instance.
- Object storage: private bucket with controlled access.
- CI/CD: automated linting, testing, and deployment.

## 6.2 High-level architecture

Browser frontend  
→ API gateway / FastAPI  
→ Authentication and validation  
→ Interview session service  
→ Question and conversation engine  
→ Speech recognition  
→ Answer assessment service  
→ Audio feature extraction  
→ Evidence and feedback generation  
→ PostgreSQL and private audio storage  
→ Report and progress APIs  
→ Browser frontend

### Service responsibilities

**Frontend**
- Collects microphone input.
- Plays interviewer speech.
- Displays questions, transcript, timers, and feedback.
- Manages session controls and error states.

**Interview service**
- Owns session state.
- Selects questions and follow-ups.
- Tracks rubric coverage.
- Controls interview progression.

**Speech service**
- Transcribes candidate audio.
- Provides timestamps or confidence information when supported.

**Audio analysis service**
- Extracts speech intervals, duration, pause metrics, and speaking rate.

**Assessment service**
- Evaluates the transcript against the relevant rubric.
- Produces structured criterion-level results.

**Feedback service**
- Connects assessments to transcript evidence.
- Generates actionable improvement recommendations.

**Persistence service**
- Stores users, sessions, questions, answers, scores, reports, and consent metadata.

## 6.3 Real-time interaction protocol

Use ordinary HTTP APIs for authentication, configuration, session creation, reports, and history.

Use WebSockets or Server-Sent Events for live session events where useful. WebSockets are appropriate if the application needs bidirectional live messaging. Server-Sent Events are suitable for server-to-browser progress updates.

Possible event types:

- `interview.started`
- `question.presented`
- `recording.started`
- `recording.stopped`
- `transcription.started`
- `transcription.completed`
- `assessment.started`
- `assessment.completed`
- `followup.generated`
- `interview.completed`
- `interview.error`

Audio can initially be uploaded per answer. Streaming audio is a later optimization, not a prerequisite for delivering a working voice interview.

## 6.4 Suggested repository structure

```text
interview-platform/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── interview/
│   │   │   ├── reports/
│   │   │   └── progress/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── ai/
│   │   │   ├── speech/
│   │   │   ├── audio/
│   │   │   ├── assessment/
│   │   │   └── feedback/
│   │   └── main.py
│   ├── migrations/
│   └── tests/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

Keep provider integrations behind interfaces so that changing a speech or language model does not require changing the entire application.

---

# 7. Frontend Product and UX Specification

## 7.1 Design direction

Use a modern, restrained SaaS interface.

**Visual principles:**
- Pale blue-gray or neutral backgrounds.
- White or lightly tinted content surfaces.
- Charcoal primary text.
- One restrained accent color.
- Clear typography hierarchy.
- Generous whitespace.
- Subtle borders and shadows.
- Minimal animation.
- Strong contrast and accessible controls.

Avoid making every score a bright, gamified badge. The interface should feel like a professional coaching workspace.

## 7.2 Main pages

### Page 1: Landing page

Purpose: Explain the product and encourage users to practise.

Sections:
- Product headline.
- Short explanation of voice-based interview practice.
- Start practising CTA.
- Sales and bug-fixing interview cards.
- Example assessment report.
- How it works.
- Privacy and limitations.
- Login and registration links.

### Page 2: Registration and login

Components:
- Email field.
- Password field.
- Validation messages.
- Password recovery.
- Consent and privacy links.

### Page 3: Candidate dashboard

Components:
- Welcome message.
- Start Interview CTA.
- Interview-track cards.
- Recent sessions.
- Progress summary.
- Suggested next practice goal.
- Interview history.

### Page 4: Interview setup

Components:
- Track selection.
- Difficulty selection.
- Interview duration.
- Voice and language options.
- Microphone test.
- Recording consent.
- Interview start action.

### Page 5: Live interview room

This is the most important page.

**Suggested desktop layout:**

```text
┌────────────────────────────────────────────────────┐
│ Logo    Sales Interview      Time Remaining   Exit  │
├────────────────────────────────────────────────────┤
│                                                    │
│              AI INTERVIEWER                        │
│                                                    │
│      "How would you handle this objection?"        │
│                                                    │
│             [Replay Question]                      │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│         Microphone / Listening Indicator           │
│                                                    │
│           Recording duration: 00:18                │
│                                                    │
│       [Start Answer] [Stop] [Retry]                │
│                                                    │
├────────────────────────────────────────────────────┤
│ Transcript preview                                 │
│                                                    │
│ "I would first ask the customer..."                │
│                                                    │
│                       [Submit Answer]              │
└────────────────────────────────────────────────────┘
```

The exact layout should adapt to mobile screens.

**Live interview states:**

- Preparing microphone.
- Interviewer speaking.
- Ready to answer.
- Recording.
- Processing answer.
- Generating follow-up.
- Recoverable error.
- Interview paused.
- Interview completed.

The candidate should always know whether the microphone is active.

### Page 6: Answer review

Components:
- Original question.
- Transcript.
- Audio playback.
- Retry or edit transcript where supported.
- Submit and continue.

If editing is allowed, preserve the original speech-derived transcript and mark the edited version separately. Do not silently treat edited text as the exact spoken answer for speech assessment.

### Page 7: Interview report

Components:
- Summary.
- Content assessment.
- Delivery metrics.
- Rubric breakdown.
- Evidence and explanations.
- Improvement recommendations.
- Question-by-question review.
- Download or print report.
- Practise again CTA.

### Page 8: Progress dashboard

Components:
- Session timeline.
- Comparable-session trends.
- Criterion-level progress.
- Recurring weaknesses.
- Practice goals.
- Links to previous reports.

### Page 9: Profile and privacy

Components:
- Account settings.
- Recording retention preferences.
- Data deletion.
- Consent information.
- Sign out.

## 7.3 Interaction design requirements

- Use clear loading indicators for model processing.
- Never make a disabled button appear clickable.
- Provide explicit error recovery.
- Avoid unexpected microphone activation.
- Keep question text visible even when speech is playing.
- Offer keyboard-accessible controls.
- Support mobile browsers with graceful fallbacks.
- Do not rely on color alone to communicate assessment status.

---

# 8. Backend API Specification

All APIs should be versioned under `/api/v1`.

## 8.1 Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/refresh` | Refresh authentication if using refresh tokens |
| POST | `/auth/logout` | End the session |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Complete password reset |
| GET | `/users/me` | Retrieve current profile |
| PATCH | `/users/me` | Update profile |
| DELETE | `/users/me` | Request account deletion |

## 8.2 Interview configuration

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/interview-tracks` | List available tracks |
| GET | `/interview-tracks/{track_id}/rubric` | Retrieve rubric criteria |
| GET | `/interview-configurations` | List available configurations |
| POST | `/interviews` | Create a session |
| GET | `/interviews/{session_id}` | Retrieve session details |
| POST | `/interviews/{session_id}/start` | Start the session |
| POST | `/interviews/{session_id}/pause` | Pause the session |
| POST | `/interviews/{session_id}/resume` | Resume the session |
| POST | `/interviews/{session_id}/end` | End the session |

## 8.3 Questions and answers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/interviews/{session_id}/current-question` | Retrieve current question |
| POST | `/interviews/{session_id}/answers` | Submit an answer |
| GET | `/interviews/{session_id}/answers` | List answers |
| GET | `/answers/{answer_id}` | Retrieve answer details |
| POST | `/answers/{answer_id}/retry-transcription` | Retry transcription |
| GET | `/answers/{answer_id}/transcript` | Retrieve transcript |
| GET | `/answers/{answer_id}/assessment` | Retrieve assessment |

Answer submission should return a job or processing identifier when transcription and evaluation are asynchronous.

## 8.4 Reports and progress

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/interviews/{session_id}/report` | Retrieve final report |
| GET | `/interviews/history` | Retrieve session history |
| GET | `/progress/overview` | Retrieve progress summary |
| GET | `/progress/criteria` | Retrieve criterion-level trends |
| GET | `/progress/recommendations` | Retrieve practice recommendations |

## 8.5 Audio upload

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/answers/{answer_id}/audio` | Upload recorded audio |
| GET | `/answers/{answer_id}/audio` | Obtain authorized playback access |
| DELETE | `/answers/{answer_id}/audio` | Delete retained audio |

Audio access must be authorized and time-limited where signed URLs are used.

## 8.6 Health and operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |
| GET | `/api/v1/status` | Application status |
| GET | `/api/v1/status/ai` | Safe status of configured AI providers |

Do not expose credentials, stack traces, internal infrastructure details, or private provider information through public health endpoints.

## 8.7 Example answer submission

Request:

```json
{
  "session_id": "session_123",
  "question_id": "question_456",
  "audio_upload_id": "audio_789",
  "language": "en"
}
```

Example response:

```json
{
  "answer_id": "answer_101",
  "status": "processing",
  "message": "Your answer is being transcribed and assessed."
}
```

The frontend can poll the answer status or receive a completion event.

The API must validate that the question belongs to the session and that the authenticated user owns the session.

---

# 9. Database Design

Use PostgreSQL for persistent application state.

## 9.1 Users

Fields:
- `id`
- `email`
- `password_hash`
- `display_name`
- `created_at`
- `updated_at`
- `account_status`
- `privacy_preferences`

## 9.2 Interview tracks

Fields:
- `id`
- `name`
- `description`
- `track_type`
- `is_active`

Initial tracks:
- Sales.
- Software Engineering Bug-Fixing.

## 9.3 Rubrics and criteria

**Rubrics**
- `id`
- `track_id`
- `version`
- `name`
- `created_at`

**Rubric criteria**
- `id`
- `rubric_id`
- `criterion_name`
- `description`
- `scoring_guidance`
- `weight`
- `maximum_score`

Rubric versioning ensures that historical reports remain interpretable when evaluation rules change.

## 9.4 Interview sessions

Fields:
- `id`
- `user_id`
- `track_id`
- `rubric_version_id`
- `difficulty`
- `status`
- `started_at`
- `completed_at`
- `duration_seconds`
- `configuration`

## 9.5 Questions

Fields:
- `id`
- `session_id`
- `question_text`
- `question_type`
- `sequence_number`
- `interview_stage`
- `created_at`

## 9.6 Answers

Fields:
- `id`
- `session_id`
- `question_id`
- `transcript`
- `edited_transcript`
- `audio_storage_key`
- `audio_duration_seconds`
- `transcription_status`
- `assessment_status`
- `created_at`

Do not store raw audio directly in ordinary relational database rows.

## 9.7 Audio metrics

Fields:
- `id`
- `answer_id`
- `speech_duration_seconds`
- `speaking_rate`
- `pause_count`
- `total_pause_duration_seconds`
- `filler_count`
- `audio_quality_status`
- `analysis_metadata`

Store the metric definitions and analysis version where necessary so that later model changes do not silently alter the meaning of historical reports.

## 9.8 Assessments

Fields:
- `id`
- `answer_id`
- `criterion_id`
- `score`
- `confidence`
- `rationale`
- `evidence`
- `missing_elements`
- `model_version`
- `rubric_version`
- `created_at`

## 9.9 Reports and recommendations

**Reports**
- `id`
- `session_id`
- `summary`
- `content_score`
- `delivery_summary`
- `overall_score`
- `score_configuration`
- `created_at`

**Recommendations**
- `id`
- `session_id`
- `criterion_id`
- `recommendation_text`
- `priority`
- `status`

Only populate an overall score when a defined aggregation method exists. Otherwise, present separate dimension scores and a qualitative summary.

## 9.10 Processing jobs

Fields:
- `id`
- `answer_id`
- `job_type`
- `status`
- `attempt_count`
- `error_code`
- `created_at`
- `completed_at`

This supports retries, asynchronous processing, and operational debugging without exposing internal errors to the candidate.

---

# 10. Assessment and Scoring Engine

## 10.1 Assessment pipeline

For each answer:

1. Validate the uploaded audio.
2. Transcribe speech.
3. Associate the transcript with the question and session.
4. Extract audio features.
5. Evaluate the answer against the relevant rubric.
6. Identify transcript evidence for each criterion.
7. Generate feedback and improvement suggestions.
8. Validate the structured assessment.
9. Store the results.
10. Continue the interview or generate the final report.

## 10.2 Initial scoring method

For the first version, use rubric-guided language-model assessment supported by deterministic validation and evidence extraction.

A model may return a criterion score from 0 to 4:

| Score | Meaning |
|---|---|
| 0 | No relevant evidence |
| 1 | Limited evidence |
| 2 | Partial coverage |
| 3 | Strong coverage |
| 4 | Thorough and well-supported coverage |

Each rubric must define what these levels mean for its own criteria.

A score of 0 must not be assigned merely because the candidate used different wording from a reference answer.

## 10.3 Evidence validation

For each criterion, the assessment service should produce structured output containing:

- Score.
- Explanation.
- Supporting transcript excerpts.
- Missing criteria.
- Confidence or uncertainty.
- Recommended next step.

The backend must validate the response against a schema. If evidence cannot be linked to the actual transcript, the assessment should be marked uncertain or regenerated.

## 10.4 Content score and delivery metrics

Content scores come from rubric-based evaluation.

Delivery metrics come from audio analysis.

They should remain separate in the database and report. Any combined score must use an explicitly documented weighting policy and be validated against human ratings before being treated as meaningful.

## 10.5 Research and model validation

A future trained fusion model may combine text and audio features.

To evaluate whether multimodal analysis helps, compare:

- Text-only assessment.
- Audio-feature assessment.
- Combined text-plus-audio assessment.

Use human-rated responses and held-out evaluation data.

Possible metrics:
- MAE and RMSE for numeric ratings.
- F1 and precision/recall for categorical outcomes.
- Inter-rater agreement.
- Calibration and uncertainty.
- Performance across relevant speech and language groups.
- Stability when content is unchanged but delivery characteristics differ.

Without appropriate labeled data, the product must not claim that a trained multimodal model has achieved validated performance. The initial implementation is a functional assessment pipeline, not proof that every assessment is objectively accurate.

---

# 11. Prompt and AI Behaviour Requirements

## 11.1 Interviewer prompt responsibilities

The interviewer model should receive:

- Interview track.
- Current stage.
- Question and rubric.
- Previous questions and answers.
- Criteria already covered.
- Remaining interview time.
- Candidate's latest response.

It should return a structured decision, such as:

- Continue to the next planned question.
- Ask one focused follow-up.
- Clarify an ambiguous answer.
- End the interview.

## 11.2 Interviewer behaviour

The AI interviewer must:

- Maintain a professional and respectful tone.
- Ask one question at a time.
- Avoid repeating already answered questions.
- Adapt follow-ups to the candidate's response.
- Avoid disclosing the ideal answer during the assessment.
- Avoid inventing facts about the candidate.
- End the session within the configured limits.

## 11.3 Assessment prompt responsibilities

The assessment model must:

- Follow the track-specific rubric.
- Consider alternative valid approaches.
- Distinguish claims from evidence.
- Avoid assuming unmentioned facts.
- Explain score decisions.
- Quote only text actually present in the transcript.
- Mark ambiguous or incomplete evidence.
- Avoid inferring confidence or competence from accent, identity, or personality stereotypes.

## 11.4 Output validation

Model responses must use a structured schema rather than arbitrary prose wherever the backend needs machine-readable output.

The backend must handle:
- Invalid JSON.
- Missing fields.
- Out-of-range scores.
- Unsupported criterion identifiers.
- Fabricated evidence.
- Provider timeouts.
- Empty or unusable transcripts.

---

# 12. Security, Privacy, and Responsible AI

## 12.1 Security requirements

- Hash passwords using an appropriate password-hashing algorithm.
- Use HTTPS.
- Validate all incoming requests.
- Enforce ownership checks on sessions, answers, and recordings.
- Use parameterized database operations.
- Apply rate limits to authentication and expensive AI endpoints.
- Restrict audio file type and size.
- Keep API keys in server-side environment configuration or a secrets manager.
- Never expose AI provider keys to the frontend.
- Avoid logging raw audio, passwords, tokens, or sensitive transcript contents unnecessarily.
- Use short-lived signed URLs for private media.
- Apply dependency and vulnerability checks.
- Implement backup and recovery procedures.

## 12.2 Privacy requirements

- Obtain consent before recording.
- Explain how audio and transcripts are processed.
- Define a retention policy.
- Allow users to delete recordings and accounts.
- Restrict access to reports and transcripts.
- Avoid sending more personal data to model providers than necessary.
- Disclose when external AI services process data.
- Avoid using candidate data for model training without appropriate permission and governance.

## 12.3 Responsible assessment

The platform is a coaching and decision-support system.

It must not:
- Automatically reject candidates.
- Claim to diagnose personality or psychological characteristics.
- Treat speaking speed as a universal measure of communication quality.
- Treat accents as evidence of lower ability.
- Claim that semantic similarity proves technical correctness.
- Hide uncertainty behind an authoritative-looking score.

Human review and explicit evidence should remain available for assessments that could influence real recruitment decisions.

---

# 13. Non-functional Requirements

## 13.1 Performance

Initial engineering targets, to be validated under realistic workloads:

- Dashboard and report APIs: p95 under 500 ms for ordinary database-backed requests.
- Session creation: p95 under 1 second, excluding external provider delays.
- UI acknowledgement of recording controls: near-instantaneous.
- Post-answer processing: target a few seconds for typical short responses, subject to model and hosting latency.
- Long-running requests must expose progress rather than leaving the interface frozen.

AI processing latency should be measured separately from ordinary API latency.

## 13.2 Reliability

- Persist completed answers incrementally.
- Retry transient provider failures safely.
- Use idempotency controls for answer submission.
- Prevent duplicate answer processing.
- Show understandable errors.
- Provide partial reports when full assessment fails and useful partial results are available.

## 13.3 Scalability

The initial architecture should support independent scaling of:

- Web frontend.
- API server.
- Speech processing.
- Assessment jobs.
- Database.
- Audio storage.

GPU-backed inference is optional. The initial system can use external AI providers or CPU-compatible components where practical.

## 13.4 Accessibility

- Keyboard navigation.
- Screen-reader-friendly labels.
- Visible focus indicators.
- Adequate contrast.
- Clear error messages.
- Transcript visibility.
- Alternative interaction paths when speech functionality fails.

## 13.5 Observability

Track:
- Request latency.
- Error rates.
- Speech-processing failures.
- Model-provider latency.
- Failed assessment jobs.
- Audio upload failures.
- Session completion rates.
- Resource utilization.

Use request IDs and session IDs for troubleshooting while avoiding unnecessary exposure of candidate content in logs.

---

# 14. Testing and Quality Assurance

## 14.1 Frontend tests

- Registration and login.
- Interview setup.
- Microphone permission denial.
- Start and stop recording.
- Transcript review.
- Retry and submission.
- Processing and error states.
- Final report rendering.
- Progress dashboard.
- Mobile layout and accessibility.

## 14.2 Backend tests

- Authentication and authorization.
- Session ownership.
- Request validation.
- Database transactions.
- Duplicate answer prevention.
- File upload validation.
- Assessment schema validation.
- Retry and timeout behaviour.
- Account and recording deletion.
- API contract tests.

## 14.3 AI evaluation tests

Build a representative test set for both interview tracks.

Include:
- Strong responses.
- Partial responses.
- Incorrect responses.
- Alternative valid answers.
- Short answers.
- Ambiguous answers.
- Noisy audio.
- Transcription mistakes.
- Answers containing plausible but incorrect reasoning.

Have human evaluators score responses using the same rubric. Compare model results with human ratings rather than evaluating quality only by whether the generated feedback sounds convincing.

## 14.4 End-to-end acceptance tests

**Sales interview**
- The candidate completes a spoken sales interview.
- The interviewer asks a contextual objection-handling follow-up.
- The system produces evidence-linked feedback.

**Bug-fixing interview**
- The candidate investigates a supplied software bug.
- The interviewer follows up on the candidate's hypotheses.
- The report assesses reasoning, fix quality, and testing strategy.

**Progress tracking**
- The candidate completes multiple sessions.
- The dashboard retrieves previous reports.
- Comparable-session trends are displayed correctly.

---

# 15. Product Analytics and Success Metrics

Track product quality without collecting unnecessary sensitive information.

## Product metrics
- Interview start rate.
- Interview completion rate.
- Average completed interview duration.
- Repeat practice rate.
- Report view rate.
- Recommendation engagement.

## Technical metrics
- Transcription success rate.
- AI provider failure rate.
- Median and p95 processing latency.
- Audio upload failure rate.
- Session recovery success rate.
- Cost per completed interview.

## Assessment quality metrics
- Agreement with human rubric ratings.
- MAE or RMSE for numeric assessments.
- Precision, recall, and F1 where classification is appropriate.
- Evidence validity rate.
- Percentage of assessments marked uncertain.
- Stability across repeated assessments.
- Quality differences across relevant speech conditions.

These metrics should be reported separately. Product engagement does not prove assessment accuracy, and low latency does not prove feedback quality.

---

# 16. Implementation Roadmap

## Phase 1: Product foundation

- Set up frontend and backend repositories.
- Configure authentication.
- Create PostgreSQL schema.
- Implement interview-track and rubric configuration.
- Build dashboard and interview setup.
- Implement session creation and persistence.

**Exit condition:** A user can log in, select a track, and create an interview session.

## Phase 2: Voice interview loop

- Add microphone permissions.
- Record and submit audio.
- Integrate speech-to-text.
- Add interviewer text-to-speech.
- Implement question progression.
- Add retries and processing states.

**Exit condition:** A user can complete a basic spoken interview from beginning to end.

## Phase 3: Assessment engine

- Implement sales rubric.
- Implement bug-fixing rubric.
- Add structured model evaluation.
- Add evidence extraction and validation.
- Add speech feature extraction.
- Generate the final report.

**Exit condition:** Completed interviews produce separate content and delivery results with evidence-linked feedback.

## Phase 4: Progress and reliability

- Add session history.
- Build progress charts.
- Add practice recommendations.
- Add robust retries and idempotency.
- Implement data deletion and retention.
- Add observability and automated tests.

**Exit condition:** Users can practise repeatedly and review historical performance reliably.

## Phase 5: Evaluation and optimization

- Create a human-rated test set.
- Evaluate scoring consistency.
- Measure speech-processing latency.
- Test alternative valid answers.
- Analyze uncertainty and subgroup performance.
- Optimize costs and processing speed.

**Exit condition:** The team has documented measured quality, limitations, and performance rather than relying on unsupported accuracy claims.

---

# 17. MVP Acceptance Criteria

The first complete product is considered functional when:

1. A user can register, log in, and manage their account.
2. A user can choose Sales or Software Engineering Bug-Fixing.
3. A user can begin an interview and hear the AI interviewer.
4. The system records a spoken response with explicit microphone controls.
5. The response is transcribed and associated with the correct question.
6. The interviewer can ask at least one relevant contextual follow-up.
7. The assessment service produces rubric-based results.
8. Content evaluation and speech metrics remain separate.
9. The report contains valid transcript evidence and actionable feedback.
10. The user can review past sessions.
11. The system can show progress across multiple sessions.
12. Audio access and account data are protected by authorization checks.
13. Failed processing can be retried without creating duplicate answers.
14. Users can delete their recordings and request account deletion.
15. The interface handles microphone denial, transcription failure, and provider downtime gracefully.

---

# 18. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Incorrect transcription | Expose uncertainty and allow retry |
| Generic AI feedback | Use track-specific rubrics and evidence requirements |
| Semantic similarity mistaken for correctness | Use criterion-based reasoning and domain validation |
| Inconsistent scores | Version rubrics, benchmark against human ratings, and monitor drift |
| Speech metrics unfairly penalize candidates | Keep metrics separate and contextualize feedback |
| Slow AI processing | Use asynchronous jobs, progress states, and latency monitoring |
| High inference cost | Limit unnecessary model calls and evaluate provider/model trade-offs |
| Fabricated supporting evidence | Validate excerpts against the original transcript |
| Lost or duplicated answers | Persist incrementally and use idempotency keys |
| Privacy exposure | Restrict access, minimize retention, and provide deletion controls |
| Overly repetitive interviews | Track covered criteria and question history |

---

# 19. Future Enhancements

These are outside the initial release and should not delay the core product:

- Learned multimodal fusion model using human-rated data.
- Advanced streaming speech recognition.
- More interview tracks and job roles.
- Configurable organization rubrics.
- Recruiter review dashboard.
- Secure code execution for coding tasks.
- Additional languages.
- More sophisticated longitudinal analysis.
- Research tooling for text-only versus text-plus-audio comparisons.

Video-related features remain excluded from the current product scope.

---

# 20. Final Product Definition

The finished product is a web-based AI interview coach with two focused interview experiences: a non-technical sales interview and a technical software-engineering bug-fixing interview.

Candidates interact with a spoken AI interviewer, receive contextual follow-up questions, and get structured reports based on answer content and measurable speech characteristics.

The product's central differentiator is **evidence-grounded assessment with separate content and delivery feedback, followed by actionable practice recommendations and progress tracking**.

The system should be useful before a validated learned multimodal model exists, while its architecture and evaluation pipeline should make future model improvements measurable.

Success means delivering a complete, reliable interview-practice workflow and demonstrating that its assessments are understandable, useful, and appropriately validated, not merely generating convincing AI-written reports.