import logging
import uuid
from datetime import datetime, timedelta
from ..db.database import SessionLocal
from ..models.models import (
    InterviewTrack,
    Rubric,
    RubricCriterion,
    User,
    RoleModel,
    Invite,
    InterviewSession,
    Question,
    Answer,
    AudioMetric,
    VideoFeature,
    Score,
    Report,
    Contest,
    Review,
    HumanRating,
    AuditLog
)
from ..core.security import get_password_hash

logger = logging.getLogger(__name__)

def seed_default_data():
    db = SessionLocal()
    try:
        # 1. Seed Demo Users for all PRD Roles
        users_to_seed = [
            ("demo@ai-interview.com", "Demo Candidate", "candidate"),
            ("candidate@ai-interview.com", "Alex Chen (Candidate)", "candidate"),
            ("recruiter@ai-interview.com", "Sarah Jenkins (Lead Recruiter)", "recruiter"),
            ("reviewer@ai-interview.com", "Dr. Marcus Vance (Chief Reviewer)", "reviewer"),
            ("admin@ai-interview.com", "System Administrator", "admin"),
        ]

        created_users = {}
        for email, name, role in users_to_seed:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    password_hash=get_password_hash("DemoPass123!"),
                    display_name=name,
                    role=role,
                    consent_recording=True,
                    privacy_preferences={"retain_audio": True, "share_telemetry": False, "ttl_days": 1}
                )
                db.add(user)
                db.flush()
                logger.info(f"Created default user: {email} ({role})")
            created_users[role] = user

        # 2. Seed Standard Tracks & Criteria (Sales & Bug-Fixing)
        # Sales Track
        sales_track = db.query(InterviewTrack).filter(InterviewTrack.id == "sales").first()
        if not sales_track:
            sales_stages = [
                {
                    "stage_id": "customer_discovery",
                    "title": "Customer Discovery",
                    "sequence": 1,
                    "description": "Uncover customer challenges, timeline, and criteria.",
                    "prompt_template": "You are speaking with a prospective client who says your SaaS product looks great but is 25% over their budget. How would you handle this?",
                    "expected_concepts": ["Open-ended questions", "Budget exploration", "Pain points", "Value proposition"]
                },
                {
                    "stage_id": "value_proposition",
                    "title": "Value Proposition & ROI",
                    "sequence": 2,
                    "description": "Quantify business impact and connect features to client outcomes.",
                    "prompt_template": "How would you frame the ROI of saving 8 hours per engineer each week against the subscription cost?",
                    "expected_concepts": ["Quantified ROI", "Opportunity cost", "Executive alignment"]
                },
                {
                    "stage_id": "objection_handling",
                    "title": "Objection Handling",
                    "sequence": 3,
                    "description": "Address concerns without immediately discounting.",
                    "prompt_template": "The client states that their internal team can build a similar tool in 2 months. How do you respond?",
                    "expected_concepts": ["Total cost of ownership", "Maintenance overhead", "Time to value"]
                }
            ]
            sales_track = InterviewTrack(
                id="sales",
                name="Sales & Consultative Client Strategy",
                description="Assesses discovery questioning, ROI framing, objection de-escalation, and consultative closing.",
                track_type="non_technical",
                is_active=True,
                stages=sales_stages
            )
            db.add(sales_track)
            db.flush()

            sales_rubric = Rubric(track_id="sales", version="1.0", name="Consultative Sales Rubric")
            db.add(sales_rubric)
            db.flush()

            sales_criteria = [
                RubricCriterion(rubric_id=sales_rubric.id, criterion_key="discovery", criterion_name="Customer Discovery", description="Uncovers core constraints.", scoring_guidance="Evaluates open-ended questions.", weight=1.2, maximum_score=5),
                RubricCriterion(rubric_id=sales_rubric.id, criterion_key="value_prop", criterion_name="Value Proposition & ROI", description="Articulates business impact.", scoring_guidance="Evaluates financial quantification.", weight=1.2, maximum_score=5),
                RubricCriterion(rubric_id=sales_rubric.id, criterion_key="objection_handling", criterion_name="Objection Handling", description="Deconstructs pushback.", scoring_guidance="Avoids premature discounts.", weight=1.0, maximum_score=5),
                RubricCriterion(rubric_id=sales_rubric.id, criterion_key="communication", criterion_name="Communication Clarity", description="Clear, concise delivery.", scoring_guidance="Clarity and listening.", weight=0.8, maximum_score=5)
            ]
            db.add_all(sales_criteria)

        # Bug Fixing Track
        bug_track = db.query(InterviewTrack).filter(InterviewTrack.id == "bug_fixing").first()
        if not bug_track:
            bug_stages = [
                {
                    "stage_id": "problem_understanding",
                    "title": "Problem Understanding",
                    "sequence": 1,
                    "description": "Analyze symptoms and log patterns.",
                    "prompt_template": "An API service started returning duplicate records after a deployment. How do you isolate the root cause?",
                    "expected_concepts": ["Log inspection", "DB check", "Retry mechanism"]
                },
                {
                    "stage_id": "root_cause_reasoning",
                    "title": "Root Cause Reasoning",
                    "sequence": 2,
                    "description": "Deduce exact technical failure mechanism.",
                    "prompt_template": "If DB records are unique, what application layers could duplicate response items?",
                    "expected_concepts": ["Accumulator mutation", "Retry loop", "Pagination join"]
                },
                {
                    "stage_id": "proposed_fix",
                    "title": "Proposed Fix & Verification",
                    "sequence": 3,
                    "description": "Design clean idempotent fix and automated tests.",
                    "prompt_template": "How do you make the retry logic idempotent and verify it with automated tests?",
                    "expected_concepts": ["Idempotent set", "Fresh accumulator", "Unit test mocking retry"]
                }
            ]
            bug_track = InterviewTrack(
                id="bug_fixing",
                name="Software Engineering Troubleshooting",
                description="Evaluates systematic debugging, hypothesis testing, root cause deduction, and regression testing.",
                track_type="technical",
                is_active=True,
                stages=bug_stages
            )
            db.add(bug_track)
            db.flush()

            bug_rubric = Rubric(track_id="bug_fixing", version="1.0", name="Software Engineering Debugging Rubric")
            db.add(bug_rubric)
            db.flush()

            bug_criteria = [
                RubricCriterion(rubric_id=bug_rubric.id, criterion_key="problem_decomposition", criterion_name="Problem Decomposition", description="Breaks problem into testable boundaries.", scoring_guidance="Structured boundary checks.", weight=1.2, maximum_score=5),
                RubricCriterion(rubric_id=bug_rubric.id, criterion_key="root_cause_reasoning", criterion_name="Root-Cause Reasoning", description="Identifies exact failure mechanism.", scoring_guidance="Deduction via evidence.", weight=1.2, maximum_score=5),
                RubricCriterion(rubric_id=bug_rubric.id, criterion_key="proposed_fix", criterion_name="Proposed Fix Quality", description="Permanent idempotent fix.", scoring_guidance="Defensive design.", weight=1.0, maximum_score=5),
                RubricCriterion(rubric_id=bug_rubric.id, criterion_key="trade_offs", criterion_name="Trade-Off Awareness", description="Evaluates performance vs complexity.", scoring_guidance="Alternative approaches.", weight=0.8, maximum_score=5)
            ]
            db.add_all(bug_criteria)

        # 3. Seed Recruiter Roles with Scenarios (PRD Section 9)
        recruiter_user = created_users.get("recruiter")
        recruiter_id = recruiter_user.id if recruiter_user else None

        roles_config = [
            ("role_s1", "Distributed Systems Engineer (S1 Scenario)", "Lead microservices reliability and retry idempotency debugging.", "S1", 20, 0.20),
            ("role_s2", "Senior Software Engineer (S2 PR Review)", "Review pull requests, enforce secure code guidelines, and catch planted defects.", "S2", 20, 0.15),
            ("role_s3", "Site Reliability Engineer (S3 Incident Triage)", "Manage live production outages alongside On-call lead, PM, and Junior engineer.", "S3", 30, 0.25),
            ("role_n1", "Customer Escalation Manager (N1 Angry Customer)", "De-escalate high-stakes client frustration and resolve refund disputes empathetically.", "N1", 15, 0.35),
            ("role_n2", "Senior Admissions Advisor (N2 Hesitant Parent)", "Consult with skeptical parents, address screen-time concerns, and build trust.", "N2", 15, 0.30),
            ("role_n3", "Engineering Manager (N3 Difficult Colleague)", "Resolve inter-team friction, unblock delayed handoffs, and align communication.", "N3", 20, 0.30)
        ]

        for r_id, title, jd, scenario, duration, delivery_w in roles_config:
            existing_role = db.query(RoleModel).filter(RoleModel.id == r_id).first()
            if not existing_role:
                new_role = RoleModel(
                    id=r_id,
                    recruiter_id=recruiter_id,
                    title=title,
                    jd_text=jd,
                    scenario_type=scenario,
                    duration_minutes=duration,
                    video_enabled=True,
                    delivery_weight=delivery_w,
                    presentation_weight=0.0
                )
                db.add(new_role)
                db.flush()

                # Generate single-use invite
                invite = Invite(
                    role_id=new_role.id,
                    token=f"prism-invite-{scenario.lower()}-demo",
                    candidate_email="alex.candidate@example.com",
                    expires_at=datetime.utcnow() + timedelta(days=14)
                )
                db.add(invite)

        # 4. Seed Human Ratings for Agreement Dashboard (Section 16)
        existing_hr = db.query(HumanRating).first()
        if not existing_hr:
            sample_ratings = [
                ("session-seed-1", "rater_jenna", "Problem Decomposition", 4.0, "Thorough boundary analysis.", "Tier-1 Universities"),
                ("session-seed-1", "rater_marcus", "Problem Decomposition", 4.2, "Identified accumulator failure immediately.", "Tier-1 Universities"),
                ("session-seed-2", "rater_jenna", "Communication Clarity", 3.5, "Good cadence with minimal filler words.", "Tier-2/3 Universities"),
                ("session-seed-2", "rater_marcus", "Communication Clarity", 3.6, "Very structured explanation.", "Tier-2/3 Universities"),
                ("session-seed-3", "rater_jenna", "Customer Discovery", 4.5, "Masterful open-ended questioning.", "Non-traditional / Self-taught"),
                ("session-seed-3", "rater_marcus", "Customer Discovery", 4.4, "High empathy and client alignment.", "Non-traditional / Self-taught")
            ]
            for s_id, r_id, dim, val, rat, subg in sample_ratings:
                hr = HumanRating(
                    session_id=s_id,
                    rater_id=r_id,
                    dimension=dim,
                    value=val,
                    rationale=rat,
                    subgroup=subg
                )
                db.add(hr)

        # 5. Seed a Completed Session with Recruiter Scorecard & Review Queue item
        candidate_user = created_users.get("candidate")
        sample_session_id = "prism-demo-session-s1"
        sample_session = db.query(InterviewSession).filter(InterviewSession.id == sample_session_id).first()
        if not sample_session and candidate_user:
            sample_session = InterviewSession(
                id=sample_session_id,
                user_id=candidate_user.id,
                track_id="bug_fixing",
                role_id="role_s1",
                mode="tech_scenario",
                scenario_id="S1",
                difficulty="intermediate",
                duration_minutes=20,
                voice_preference="default",
                video_enabled=True,
                status="completed",
                needs_review=True,
                review_reason="Confidence interval wide on Trade-Off Awareness (width: 1.35)",
                candidate_consent={"audio": True, "video": True, "ttl_hours": 24},
                started_at=datetime.utcnow() - timedelta(minutes=25),
                completed_at=datetime.utcnow() - timedelta(minutes=5)
            )
            db.add(sample_session)
            db.flush()

            # Seed Turn 1
            q1 = Question(
                session_id=sample_session.id,
                question_text="A microservice started returning duplicate records after a network timeout retry. How would you investigate and fix the accumulator bug?",
                question_type="initial",
                sequence_number=1,
                interview_stage="Problem Understanding & Deduction"
            )
            db.add(q1)
            db.flush()

            a1 = Answer(
                session_id=sample_session.id,
                question_id=q1.id,
                transcript="I inspected the logs and noticed the processed list was defined outside the retry loop. When a ConnectionError triggered a retry, previously appended IDs were not cleared or deduplicated. I fixed this by using an idempotent set and resetting the accumulator per attempt.",
                t_start=15.0,
                t_end=52.0,
                transcription_status="success",
                assessment_status="completed"
            )
            db.add(a1)
            db.flush()

            # Voice & Video metrics
            db.add(AudioMetric(
                answer_id=a1.id,
                speech_duration_seconds=37.0,
                speaking_rate=142.0,
                articulation_rate=155.0,
                pause_count=3,
                total_pause_duration_seconds=2.8,
                mean_pause_duration_seconds=0.93,
                filler_count=1,
                audio_quality_status="good"
            ))

            db.add(VideoFeature(
                session_id=sample_session.id,
                t_seconds=30.0,
                framing_stability=0.94,
                gaze_at_camera_ratio=0.88,
                head_pose_variance=0.10,
                descriptive_notes="Candidate maintained stable centering with attentive eye contact toward the workspace."
            ))

            # Seed Scores with CI bounds, evidence clips, and counterfactual modality deltas
            score_data = [
                ("Problem Decomposition", 4.4, 4.05, 4.75, 0.18, 0.2, -0.3, "Clear boundary isolation between network layer and memory accumulator."),
                ("Root-Cause Reasoning", 4.3, 3.95, 4.65, 0.20, 0.15, -0.25, "Pinpointed outer loop scope mutation causing record duplication."),
                ("Proposed Fix Quality", 4.5, 4.20, 4.80, 0.16, 0.10, -0.4, "Implemented idempotent set with automated unit test validation."),
                ("Trade-Off Awareness", 3.2, 2.50, 3.85, 0.38, 0.3, -0.2, "Addressed memory implications but did not detail distributed lock trade-offs.")
            ]

            for dim, val, ci_l, ci_h, se, d_voice, d_text, excerpt in score_data:
                sc = Score(
                    session_id=sample_session.id,
                    dimension=dim,
                    modality="fused",
                    value=val,
                    ci_low=ci_l,
                    ci_high=ci_h,
                    std_error=se,
                    evidence_clips=[{
                        "t_start": 18.0,
                        "t_end": 42.0,
                        "excerpt": excerpt,
                        "reason": f"Demonstrated concrete mastery in {dim}."
                    }],
                    modality_deltas={
                        "marginal_voice_contribution": d_voice,
                        "marginal_video_contribution": 0.0,
                        "marginal_text_contribution": d_text,
                        "score_without_voice": round(val - d_voice, 2),
                        "score_without_video": val,
                        "score_without_text": round(val - d_text, 2)
                    }
                )
                db.add(sc)

            # Seed Recruiter & Candidate Report
            report = Report(
                session_id=sample_session.id,
                summary="Candidate completed Distributed Systems Engineer (S1) scenario with an overall fused score of 4.1 / 5.0 (Calibrated 90% CI: [3.8 - 4.4]). Evaluated across 4 rubric dimensions with timestamped code and speech evidence.",
                content_score=82.0,
                overall_score=4.1,
                overall_ci_low=3.8,
                overall_ci_high=4.4,
                delivery_summary={
                    "average_wpm": 142.0,
                    "articulation_rate": 155.0,
                    "total_pause_count": 3,
                    "total_filler_words": 1,
                    "speech_duration_seconds": 37.0
                },
                video_summary={
                    "framing_stability": 0.94,
                    "gaze_at_camera_ratio": 0.88,
                    "descriptive_notes": "Consistent framing and natural gaze orientation.",
                    "weight_applied": 0.0
                },
                strengths=[
                    "Strong command of Proposed Fix Quality: 4.5/5.0 with clean idempotent design.",
                    "High diagnostic precision: quickly identified un-cleared memory accumulator."
                ],
                improvement_areas=[
                    {
                        "dimension": "Trade-Off Awareness",
                        "score": 3.2,
                        "ci": "[2.50 - 3.85]",
                        "issue": "High prediction uncertainty. Answers touched on memory scope but skipped concurrency trade-offs.",
                        "drill": "Practice Drill: Formulate explicit trade-offs comparing in-memory deduplication vs distributed Redis token-bucket."
                    }
                ],
                drills=[
                    {
                        "title": "Drill: Distributed Lock Trade-Offs",
                        "instruction": "Explain when to use an idempotency key database table versus an in-memory set under multi-worker scaling."
                    }
                ],
                modality_breakdown={"text_overall": 4.2, "voice_delivery": 4.1, "video_presentation": 0.0},
                counterfactual_deltas={"avg_voice_delta": 0.18, "avg_video_delta": 0.0},
                integrity_notes=["Zero unauthorized tab blur events recorded.", "Code changes matched candidate speech cadence."],
                score_configuration={"method": "prism_multimodal_5head_ensemble", "max_score": 5.0}
            )
            db.add(report)

            # Seed a sample candidate contest (PRD Section 6 FR18)
            contest = Contest(
                session_id=sample_session.id,
                candidate_id=candidate_user.id,
                dimension="Trade-Off Awareness",
                timestamp_seconds=35.0,
                reason="At timestamp 00:35, I explicitly discussed the latency penalty of synchronous Redis lookups versus in-memory sets, which was scored too low.",
                status="pending"
            )
            db.add(contest)

            # Seed Audit Log entry
            audit = AuditLog(
                actor="system",
                action="session_finalized",
                target=f"session:{sample_session.id}",
                details={"scores_generated": 4, "routed_to_review": True}
            )
            db.add(audit)

        db.commit()
        logger.info("Database successfully seeded with PRD users, roles, scenarios, and calibration fixtures.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        db.close()
