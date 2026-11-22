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
    AuditLog,
    Assessment,
    Recommendation
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

        # 6. Seed Complete 5-Stage Benchmark Interviews with Full Q&A & Exemplars for Candidates
        candidate_users = db.query(User).filter(User.role == "candidate").all()
        for cand in candidate_users:
            _seed_completed_5stage_interview(
                db=db,
                user=cand,
                track_id="bug_fixing",
                session_id=f"benchmark-swe-{cand.id[:8]}",
                score=88.0,
                started_offset_hours=1.5
            )
            _seed_completed_5stage_interview(
                db=db,
                user=cand,
                track_id="sales",
                session_id=f"benchmark-sales-{cand.id[:8]}",
                score=86.0,
                started_offset_hours=4.0
            )

        # 7. Seed Pre-made Custom Interviews with Interviewer Questions & Model Answers
        recruiter_user = db.query(User).filter(User.role == "recruiter").first()
        _seed_premade_custom_interview(
            db=db,
            recruiter=recruiter_user,
            role_id="custom-role-tech-demo",
            title="Senior Cloud & Distributed Systems Assessment",
            track="tech",
            invite_code="TECH-101",
            questions=[
                {
                    "sequence_number": 1,
                    "stage": "Architecture & Idempotency",
                    "question_type": "verbal",
                    "question_text": "An API service starts returning duplicate records during network timeouts and retry storms. How do you isolate and resolve the root cause?",
                    "correct_answer": "I isolate between the database and in-memory accumulator by inspecting telemetry logs. To prevent duplicate execution on retry storms, I enforce an idempotency key using Redis SETNX with TTL and ensure atomic deduplication.",
                    "key_concepts": ["idempotency key", "Redis SETNX", "retry storms", "TTL", "atomic deduplication"]
                },
                {
                    "sequence_number": 2,
                    "stage": "Live C++ Debugging (Bug Fix)",
                    "question_type": "coding_bug_fix",
                    "question_text": "The C++ function below is supposed to filter out all records with values less than a threshold. However, it contains an iterator invalidation bug and an off-by-one bounds check causing memory crashes. Fix the function so all test cases execute cleanly.",
                    "correct_answer": (
                        "#include <iostream>\n"
                        "#include <vector>\n\n"
                        "std::vector<int> removeStaleAndDeduplicate(const std::vector<int>& records, int threshold) {\n"
                        "    std::vector<int> result;\n"
                        "    for (int val : records) {\n"
                        "        if (val >= threshold) {\n"
                        "            result.push_back(val);\n"
                        "        }\n"
                        "    }\n"
                        "    return result;\n"
                        "}\n\n"
                        "int main() {\n"
                        "    int n, threshold;\n"
                        "    if (!(std::cin >> n >> threshold)) return 0;\n"
                        "    std::vector<int> records(n);\n"
                        "    for (int i = 0; i < n; ++i) {\n"
                        "        std::cin >> records[i];\n"
                        "    }\n"
                        "    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);\n"
                        "    for (size_t i = 0; i < filtered.size(); ++i) {\n"
                        "        std::cout << filtered[i] << (i + 1 == filtered.size() ? \"\" : \" \");\n"
                        "    }\n"
                        "    std::cout << \"\\n\";\n"
                        "    return 0;\n"
                        "}\n"
                    ),
                    "starter_code": (
                        "#include <iostream>\n"
                        "#include <vector>\n\n"
                        "// BUG: Erasing elements while incrementing iterator causes skips and out-of-bounds\n"
                        "std::vector<int> removeStaleAndDeduplicate(std::vector<int>& records, int threshold) {\n"
                        "    std::vector<int> result = records;\n"
                        "    for (size_t i = 0; i <= result.size(); ++i) {\n"
                        "        if (i < result.size() && result[i] < threshold) {\n"
                        "            result.erase(result.begin() + i);\n"
                        "        }\n"
                        "    }\n"
                        "    return result;\n"
                        "}\n\n"
                        "int main() {\n"
                        "    int n, threshold;\n"
                        "    if (!(std::cin >> n >> threshold)) return 0;\n"
                        "    std::vector<int> records(n);\n"
                        "    for (int i = 0; i < n; ++i) {\n"
                        "        std::cin >> records[i];\n"
                        "    }\n"
                        "    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);\n"
                        "    for (size_t i = 0; i < filtered.size(); ++i) {\n"
                        "        std::cout << filtered[i] << (i + 1 == filtered.size() ? \"\" : \" \");\n"
                        "    }\n"
                        "    std::cout << \"\\n\";\n"
                        "    return 0;\n"
                        "}\n"
                    ),
                    "test_cases": [
                        {"input": "5 10\n5 12 8 15 20", "expected_output": "12 15 20"},
                        {"input": "4 25\n5 10 15 20", "expected_output": ""},
                        {"input": "3 1\n1 2 3", "expected_output": "1 2 3"}
                    ],
                    "key_concepts": ["iterator invalidation", "vector erase", "off-by-one", "C++ memory safety"]
                },
                {
                    "sequence_number": 3,
                    "stage": "Algorithms & Data Structures (LeetCode)",
                    "question_type": "coding_leetcode",
                    "question_text": "Given an integer array nums, find the contiguous subarray with the largest sum and return its sum (Kadane's Algorithm). Implement an optimal O(N) time and O(1) space solution in C++.",
                    "correct_answer": (
                        "#include <iostream>\n"
                        "#include <vector>\n"
                        "#include <algorithm>\n\n"
                        "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                        "    if (nums.empty()) return 0;\n"
                        "    long long current_sum = nums[0];\n"
                        "    long long max_sum = nums[0];\n"
                        "    for (size_t i = 1; i < nums.size(); ++i) {\n"
                        "        current_sum = std::max((long long)nums[i], current_sum + nums[i]);\n"
                        "        max_sum = std::max(max_sum, current_sum);\n"
                        "    }\n"
                        "    return max_sum;\n"
                        "}\n\n"
                        "int main() {\n"
                        "    int n;\n"
                        "    if (!(std::cin >> n)) return 0;\n"
                        "    std::vector<int> nums(n);\n"
                        "    for (int i = 0; i < n; ++i) {\n"
                        "        std::cin >> nums[i];\n"
                        "    }\n"
                        "    std::cout << maxSubArraySum(nums) << \"\\n\";\n"
                        "    return 0;\n"
                        "}\n"
                    ),
                    "starter_code": (
                        "#include <iostream>\n"
                        "#include <vector>\n"
                        "#include <algorithm>\n\n"
                        "// Implement Kadane's Algorithm in C++: O(N) time, O(1) auxiliary space\n"
                        "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                        "    // TODO: Write your solution here\n"
                        "    return 0;\n"
                        "}\n\n"
                        "int main() {\n"
                        "    int n;\n"
                        "    if (!(std::cin >> n)) return 0;\n"
                        "    std::vector<int> nums(n);\n"
                        "    for (int i = 0; i < n; ++i) {\n"
                        "        std::cin >> nums[i];\n"
                        "    }\n"
                        "    std::cout << maxSubArraySum(nums) << \"\\n\";\n"
                        "    return 0;\n"
                        "}\n"
                    ),
                    "test_cases": [
                        {"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6"},
                        {"input": "5\n5 4 -1 7 8", "expected_output": "23"},
                        {"input": "1\n-1", "expected_output": "-1"}
                    ],
                    "key_concepts": ["Kadane's algorithm", "dynamic programming", "O(N) time", "O(1) space", "greedy"]
                },
                {
                    "sequence_number": 4,
                    "stage": "Rollout & Safeguards",
                    "question_type": "verbal",
                    "question_text": "What production rollback safeguards and telemetry alerts do you establish before deploying a distributed bug fix?",
                    "correct_answer": "I employ canary deployment at 10% traffic, monitor p99 latency and 5xx error thresholds on Datadog, and configure automated circuit breaker rollbacks.",
                    "key_concepts": ["canary deployment", "p99 latency", "circuit breaker", "automated rollback"]
                }
            ]
        )

        _seed_premade_custom_interview(
            db=db,
            recruiter=recruiter_user,
            role_id="custom-role-sales-demo",
            title="Enterprise SaaS Account Executive - Consultative Negotiation",
            track="sales",
            invite_code="SALES-202",
            questions=[
                {
                    "sequence_number": 1,
                    "stage": "Objection Handling & Pricing",
                    "question_text": "A prospective enterprise buyer says your platform is 30% more expensive than their incumbent solution. How do you handle this objection?",
                    "correct_answer": "I validate their budget boundaries without discounting prematurely, then re-anchor discovery on total cost of ownership and time savings, showing our automation saves 15 hours per engineering sprint.",
                    "key_concepts": ["total cost of ownership", "value re-anchoring", "ROI", "no premature discount"]
                },
                {
                    "sequence_number": 2,
                    "stage": "Stakeholder Retraining Fear",
                    "question_text": "An executive stakeholder is hesitant to switch because of the perceived pain of team retraining. How do you address their fear?",
                    "correct_answer": "I validate their concern, quantify the weekly friction of their legacy tool, and offer a dedicated concierge migration and shadowing program with zero downtime guarantees.",
                    "key_concepts": ["concierge onboarding", "zero downtime", "friction quantification", "migration support"]
                },
                {
                    "sequence_number": 3,
                    "stage": "Mutual Commitment Closing",
                    "question_text": "How do you establish mutual commitment to secure a signed contract before quarter close?",
                    "correct_answer": "I anchor the signing deadline directly to the customer's internal product launch milestone so any delay in signature directly impacts their own business deliverable.",
                    "key_concepts": ["mutual action plan", "go-live milestone", "executive sponsor anchor", "business deliverable"]
                }
            ]
        )

        db.commit()
        logger.info("Database successfully seeded with PRD users, roles, scenarios, and calibration fixtures.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        db.close()


def _seed_premade_custom_interview(db, recruiter, role_id: str, title: str, track: str, invite_code: str, questions: list):
    """Seeds a pre-configured interviewer role with custom questions and model answers."""
    existing = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if existing:
        existing.custom_questions = questions
        db.flush()
        return existing
    
    role = RoleModel(
        id=role_id,
        recruiter_id=recruiter.id if recruiter else None,
        title=title,
        jd_text=f"Benchmark custom {track} interview with model answers.",
        scenario_type=track,
        duration_minutes=15,
        video_enabled=True,
        custom_questions=questions
    )
    db.add(role)
    db.flush()

    inv = db.query(Invite).filter(Invite.token == invite_code).first()
    if not inv:
        inv = Invite(
            role_id=role.id,
            token=invite_code,
            expires_at=datetime.utcnow() + timedelta(days=90)
        )
        db.add(inv)
    return role


def _seed_completed_5stage_interview(db, user, track_id: str, session_id: str, score: float, started_offset_hours: float):
    """Seeds an authentic, complete 5-stage benchmark interview with candidate speech, exemplar models, and audio metrics."""
    existing = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if existing:
        return existing

    track = db.query(InterviewTrack).filter(InterviewTrack.id == track_id).first()
    if not track:
        return None

    rubric = db.query(Rubric).filter(Rubric.track_id == track.id).first()
    criteria = rubric.criteria if rubric else []

    now = datetime.utcnow()
    start_time = now - timedelta(hours=started_offset_hours, minutes=18)
    end_time = now - timedelta(hours=started_offset_hours)

    session = InterviewSession(
        id=session_id,
        user_id=user.id,
        track_id=track.id,
        rubric_version_id=rubric.id if rubric else None,
        difficulty="intermediate",
        duration_minutes=18,
        voice_preference="en-US-JennyNeural",
        video_enabled=True,
        status="completed",
        current_stage="Post-Mortem & Rollout" if track_id == "bug_fixing" else "Mutual Commitment Closing",
        current_stage_index=4,
        started_at=start_time,
        completed_at=end_time,
        candidate_consent={"audio": True, "video": True, "retention_ttl_hours": 24}
    )
    db.add(session)
    db.flush()

    if track_id == "bug_fixing":
        scenarios = [
            {
                "stage": "Defect Origin Triage",
                "question": "An API service started returning duplicate records after a deployment under retry storms. How do you isolate the root cause?",
                "transcript": "When reproduction is intermittent under retry storms, I check distributed traces and server logs, then check whether duplicate rows exist in the database or only in the in-memory accumulator.",
                "duration": 37.0,
                "wpm": 140.0,
                "score": 4.2,
                "question_type": "initial"
            },
            {
                "stage": "Live C++ Debugging (Bug Fix)",
                "question": "The C++ event deduplicator contains an iterator invalidation bug and off-by-one error causing segmentation faults. Refactor it to ensure safe memory access and passing test cases.",
                "transcript": "I identified that vector::erase was invalidating the iteration index, and the loop condition i <= result.size() caused out-of-bounds reads. I refactored it to build an allocated result vector preserving elements >= threshold.",
                "duration": 45.0,
                "wpm": 139.0,
                "score": 4.6,
                "question_type": "coding_bug_fix",
                "code_submission": (
                    "#include <iostream>\n"
                    "#include <vector>\n\n"
                    "std::vector<int> removeStaleAndDeduplicate(const std::vector<int>& records, int threshold) {\n"
                    "    std::vector<int> result;\n"
                    "    for (int val : records) {\n"
                    "        if (val >= threshold) result.push_back(val);\n"
                    "    }\n"
                    "    return result;\n"
                    "}\n\n"
                    "int main() {\n"
                    "    int n, threshold;\n"
                    "    if (!(std::cin >> n >> threshold)) return 0;\n"
                    "    std::vector<int> records(n);\n"
                    "    for (int i = 0; i < n; ++i) std::cin >> records[i];\n"
                    "    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);\n"
                    "    for (size_t i = 0; i < filtered.size(); ++i) {\n"
                    "        std::cout << filtered[i] << (i + 1 == filtered.size() ? \"\" : \" \");\n"
                    "    }\n"
                    "    std::cout << \"\\n\";\n"
                    "    return 0;\n"
                    "}\n"
                ),
                "code_test_results": {
                    "compilation_success": True,
                    "total_tests": 3,
                    "passed_tests": 3,
                    "all_passed": True
                },
                "coding_metadata": {
                    "language": "cpp",
                    "type": "coding_bug_fix",
                    "starter_code": (
                        "#include <iostream>\n"
                        "#include <vector>\n\n"
                        "std::vector<int> removeStaleAndDeduplicate(std::vector<int>& records, int threshold) {\n"
                        "    std::vector<int> result = records;\n"
                        "    for (size_t i = 0; i <= result.size(); ++i) {\n"
                        "        if (i < result.size() && result[i] < threshold) {\n"
                        "            result.erase(result.begin() + i);\n"
                        "        }\n"
                        "    }\n"
                        "    return result;\n"
                        "}\n"
                    ),
                    "test_cases": [
                        {"input": "5 10\n5 12 8 15 20", "expected_output": "12 15 20"},
                        {"input": "4 25\n5 10 15 20", "expected_output": ""},
                        {"input": "3 1\n1 2 3", "expected_output": "1 2 3"}
                    ]
                }
            },
            {
                "stage": "Algorithms & Data Structures (LeetCode)",
                "question": "Implement an optimal O(N) time and O(1) space solution in C++ to find the maximum contiguous subarray sum (Kadane's Algorithm).",
                "transcript": "I implemented Kadane's algorithm by maintaining current_sum and max_sum in a single pass. If current_sum drops below nums[i], we restart the subarray at nums[i], achieving optimal O(N) time and O(1) auxiliary space.",
                "duration": 48.0,
                "wpm": 142.0,
                "score": 4.7,
                "question_type": "coding_leetcode",
                "code_submission": (
                    "#include <iostream>\n"
                    "#include <vector>\n"
                    "#include <algorithm>\n\n"
                    "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                    "    if (nums.empty()) return 0;\n"
                    "    long long current_sum = nums[0];\n"
                    "    long long max_sum = nums[0];\n"
                    "    for (size_t i = 1; i < nums.size(); ++i) {\n"
                    "        current_sum = std::max((long long)nums[i], current_sum + nums[i]);\n"
                    "        max_sum = std::max(max_sum, current_sum);\n"
                    "    }\n"
                    "    return max_sum;\n"
                    "}\n\n"
                    "int main() {\n"
                    "    int n;\n"
                    "    if (!(std::cin >> n)) return 0;\n"
                    "    std::vector<int> nums(n);\n"
                    "    for (int i = 0; i < n; ++i) std::cin >> nums[i];\n"
                    "    std::cout << maxSubArraySum(nums) << \"\\n\";\n"
                    "    return 0;\n"
                    "}\n"
                ),
                "code_test_results": {
                    "compilation_success": True,
                    "total_tests": 3,
                    "passed_tests": 3,
                    "all_passed": True
                },
                "coding_metadata": {
                    "language": "cpp",
                    "type": "coding_leetcode",
                    "starter_code": (
                        "#include <iostream>\n"
                        "#include <vector>\n\n"
                        "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                        "    // Write Kadane's Algorithm in C++\n"
                        "    return 0;\n"
                        "}\n"
                    ),
                    "test_cases": [
                        {"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6"},
                        {"input": "5\n5 4 -1 7 8", "expected_output": "23"},
                        {"input": "1\n-1", "expected_output": "-1"}
                    ]
                }
            },
            {
                "stage": "Incident Trade-off Decision",
                "question": "Your tech lead suggests increasing timeout limits instead of adding idempotency deduplication. How do you respond?",
                "transcript": "I explain that extending timeouts ties up connection pool threads and doesn't solve network partitions. An idempotency key guarantees correctness regardless of network instability.",
                "duration": 35.0,
                "wpm": 141.0,
                "score": 4.3,
                "question_type": "initial"
            },
            {
                "stage": "Post-Mortem & Rollout",
                "question": "Summarize the production rollout and monitoring safeguards you establish before merging this fix.",
                "transcript": "I deploy via canary at 10% traffic, monitor p99 latency and 5xx retry rates on Datadog dashboards, and set an automated circuit breaker alert.",
                "duration": 33.0,
                "wpm": 139.0,
                "score": 4.5,
                "question_type": "initial"
            }
        ]
        summary_text = "Candidate completed all 5 stages of the Software Engineering Bug-Fixing scenario with disciplined technical reasoning, clear concurrency trade-offs, and calibrated delivery pacing (~140 WPM)."
        strengths = [
            "Structured response progression following the STAR architectural model",
            "Clear articulation of competing trade-offs under high-concurrency failure conditions",
            "Consistent vocal cadence within the optimal 135-145 WPM band"
        ]
    else:
        scenarios = [
            {
                "stage": "Discovery & Stakeholder Probing",
                "question": "A prospective enterprise buyer mentions their current analytics tool is clunky but fears switching due to team retraining. How do you approach discovery?",
                "transcript": "I would first validate their retraining concern and ask how many weekly hours their team currently loses to that clunky workflow.",
                "duration": 34.0,
                "wpm": 136.0,
                "score": 4.1,
            },
            {
                "stage": "Value Proposition Alignment",
                "question": "The prospect asks why your platform is worth 30% more than their existing provider. How do you frame the value?",
                "transcript": "I lead with total cost of ownership. Our automated pipeline saves roughly 15 engineering hours per sprint per squad, which pays back the difference in under 90 days.",
                "duration": 38.0,
                "wpm": 142.0,
                "score": 4.5,
            },
            {
                "stage": "Objection Handling & Pricing",
                "question": "You are speaking with a prospective client who says your SaaS product looks great but is 25% over their budget. How would you handle this?",
                "transcript": "We can't just give an immediate discount because that devalues the software. Instead, I explore phased rollout or quarterly prepayment to align with their cash flow.",
                "duration": 36.0,
                "wpm": 138.0,
                "score": 4.3,
            },
            {
                "stage": "Stakeholder De-escalation",
                "question": "A key client is furious that a scheduled onboarding milestone was delayed by two days. How do you de-escalate?",
                "transcript": "I apologize immediately and sincerely without making excuses or blaming engineering, take personal responsibility, and provide a clear hourly roadmap for the remaining steps.",
                "duration": 40.0,
                "wpm": 144.0,
                "score": 4.4,
            },
            {
                "stage": "Mutual Commitment Closing",
                "question": "How do you secure mutual commitment from the executive sponsor to sign before the end of the quarter?",
                "transcript": "I anchor their sign-off deadline directly to their internal Q3 go-live milestone so any delay in signature directly jeopardizes their own business deliverable.",
                "duration": 32.0,
                "wpm": 140.0,
                "score": 4.3,
            }
        ]
        summary_text = "Candidate demonstrated exceptional consultative discovery, strategic objection re-framing, and consultative executive closing across all 5 evaluation stages."
        strengths = [
            "Demonstrated empathy and value re-anchoring on pricing objections",
            "Clear ROI articulation tied to customer engineering velocity",
            "Natural conversational cadence and confident closing posture"
        ]

    for idx, scen in enumerate(scenarios):
        q = Question(
            session_id=session.id,
            question_text=scen["question"],
            question_type=scen.get("question_type", "initial"),
            sequence_number=idx + 1,
            interview_stage=scen["stage"],
            expected_concepts=["idempotency", "trade-offs", "monitoring"] if track_id == "bug_fixing" else ["value", "discovery", "roi"],
            coding_metadata=scen.get("coding_metadata", {})
        )
        db.add(q)
        db.flush()

        ans = Answer(
            session_id=session.id,
            question_id=q.id,
            transcript=scen["transcript"],
            audio_duration_seconds=scen["duration"],
            audio_storage_key=f"benchmark_audio_{track_id}_{idx + 1}",
            code_submission=scen.get("code_submission"),
            code_test_results=scen.get("code_test_results", {})
        )
        db.add(ans)
        db.flush()

        metric = AudioMetric(
            answer_id=ans.id,
            speech_duration_seconds=scen["duration"],
            speaking_rate=scen["wpm"],
            articulation_rate=scen["wpm"] + 10.0,
            pause_count=3,
            total_pause_duration_seconds=2.4,
            filler_count=1,
            pitch_mean_hz=142.0,
            pitch_std_hz=22.0,
            audio_quality_status="good"
        )
        db.add(metric)

        for c in criteria[:2]:
            ass = Assessment(
                answer_id=ans.id,
                criterion_id=c.id,
                score=scen["score"],
                evidence="Candidate articulated key mechanism and trade-off considerations.",
                rationale="Systematic answer demonstrating solid technical and delivery competencies."
            )
            db.add(ass)

    rep = Report(
        session_id=session.id,
        content_score=score,
        overall_score=round(score / 20.0, 1),
        overall_ci_low=round((score / 20.0) - 0.3, 1),
        overall_ci_high=round((score / 20.0) + 0.3, 1),
        summary=summary_text,
        delivery_summary={
            "average_wpm": 140.0,
            "average_articulation_rate": 150.0,
            "total_pause_count": 16,
            "total_filler_words": 2,
            "has_audio": True
        },
        strengths=strengths,
        improvement_areas=[
            {
                "dimension": "Incident Pacing & Pauses",
                "issue": "Minor rushed phrasing when transitioning between technical sections.",
                "drill": "Practice deliberate 0.5-second pauses before articulating second-stage trade-offs."
            }
        ],
        score_configuration={
            "criteria_breakdown": [
                {
                    "criterion_id": c.id,
                    "criterion_key": c.criterion_key,
                    "criterion_name": c.criterion_name,
                    "score": round(score / 20.0, 1),
                    "maximum_score": 5,
                    "weight": c.weight,
                    "evidence": "Candidate explicitly addressed core mechanisms and trade-offs.",
                    "rationale": "High quality answer aligning with senior industry benchmarks."
                }
                for c in criteria
            ]
        }
    )
    db.add(rep)

    rec1 = Recommendation(
        session_id=session.id,
        recommendation_text="Drill verbalizing quantitative failure bounds before jumping into code fixes.",
        priority="high"
    )
    db.add(rec1)
    return session
