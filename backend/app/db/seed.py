import logging
from ..db.database import SessionLocal
from ..models.models import InterviewTrack, Rubric, RubricCriterion, User
from ..core.security import get_password_hash

logger = logging.getLogger(__name__)

def seed_default_data():
    db = SessionLocal()
    try:
        # 1. Seed demo user if none exists
        demo_user = db.query(User).filter(User.email == "demo@ai-interview.com").first()
        if not demo_user:
            demo_user = User(
                email="demo@ai-interview.com",
                password_hash=get_password_hash("DemoPass123!"),
                display_name="Demo Candidate",
                consent_recording=True,
                privacy_preferences={"retain_audio": True, "share_telemetry": False}
            )
            db.add(demo_user)
            db.commit()
            logger.info("Created default demo user: demo@ai-interview.com")

        # 2. Seed Sales Track
        sales_track = db.query(InterviewTrack).filter(InterviewTrack.id == "sales").first()
        if not sales_track:
            sales_stages = [
                {
                    "stage_id": "customer_discovery",
                    "title": "Customer Discovery",
                    "sequence": 1,
                    "description": "Uncover the customer's current challenges, goals, and evaluation criteria.",
                    "prompt_template": "You are speaking with a potential customer who is interested in your product but believes it is too expensive. How would you handle the conversation?",
                    "expected_concepts": ["Open-ended questions", "Budget exploration", "Current pain points", "Evaluation criteria"],
                    "followup_trigger": "jumped_to_pitch",
                    "followup_prompt": "Before explaining the benefits, what specific discovery questions would you ask the customer to understand why they feel the price is too high?"
                },
                {
                    "stage_id": "understanding_needs",
                    "title": "Understanding Needs",
                    "sequence": 2,
                    "description": "Probe deeper into workflow impact, urgency, and stakeholder priorities.",
                    "prompt_template": "The customer mentions that their current solution causes 5 hours of manual data entry weekly per team member, but their executive team is hesitant to invest. How do you quantify this need?",
                    "expected_concepts": ["Opportunity cost", "Labor calculation", "Executive impact", "Business urgency"],
                    "followup_trigger": "missed_quantification",
                    "followup_prompt": "How would you translate those 5 hours of manual work into concrete financial ROI or business impact for their executive sponsor?"
                },
                {
                    "stage_id": "value_proposition",
                    "title": "Value Proposition",
                    "sequence": 3,
                    "description": "Connect product benefits directly to the customer's quantified problems.",
                    "prompt_template": "How would you present your solution's value proposition directly tying back to their manual workflow bottleneck and executive ROI goals?",
                    "expected_concepts": ["Tailored solution pitch", "Automation benefit", "Executive outcome alignment"],
                    "followup_trigger": "generic_feature_dump",
                    "followup_prompt": "Instead of listing all product features, which 1 or 2 specific outcomes would you highlight for this particular stakeholder?"
                },
                {
                    "stage_id": "objection_handling",
                    "title": "Objection Handling",
                    "sequence": 4,
                    "description": "Handle tough pushback without immediately conceding discounts.",
                    "prompt_template": "Suppose the customer responds: 'A competitor offers a similar platform for 20% less cost.' How do you respond without immediately offering a discount?",
                    "expected_concepts": ["Acknowledge concern", "Differentiate value", "Total cost of ownership", "Avoid immediate price concession"],
                    "followup_trigger": "gave_discount_too_early",
                    "followup_prompt": "What questions would you ask to discover the differences in scope, implementation, or support between your solution and the cheaper competitor?"
                },
                {
                    "stage_id": "closing_strategy",
                    "title": "Closing & Next Steps",
                    "sequence": 5,
                    "description": "Agree on a clear, mutual evaluation timeline and concrete next step.",
                    "prompt_template": "The customer agrees with your points and seems engaged. How do you transition to a concrete next step or mutual action plan?",
                    "expected_concepts": ["Trial/proof of concept", "Decision maker meeting", "Mutual action plan", "Definite date/time"],
                    "followup_trigger": "vague_followup",
                    "followup_prompt": "How do you lock in a specific commitment rather than leaving it as a vague 'I'll email you next week'?"
                }
            ]

            sales_track = InterviewTrack(
                id="sales",
                name="Sales Interview",
                description="Simulates consultative B2B sales conversations covering customer discovery, objection handling, ROI value proposition, and closing strategy.",
                track_type="non_technical",
                is_active=True,
                stages=sales_stages
            )
            db.add(sales_track)
            db.flush()

            sales_rubric = Rubric(
                track_id="sales",
                version="1.0",
                name="Consultative Sales Performance Rubric"
            )
            db.add(sales_rubric)
            db.flush()

            sales_criteria = [
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="discovery",
                    criterion_name="Customer Discovery",
                    description="Asks open-ended questions that reveal underlying customer needs, constraints, and buying criteria.",
                    scoring_guidance="0: Jumps straight to selling; 1: Asks superficial closed questions; 2: Asks some budget/need questions; 3: Asks thorough open-ended discovery questions; 4: Masters consultative discovery probing deeper business drivers.",
                    keywords=["discovery", "open-ended", "budget", "needs", "pain points", "alternatives", "priorities"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="listening",
                    criterion_name="Active Listening & Needs Understanding",
                    description="Directly addresses the customer's stated constraints and emotional or business hesitation before pitching.",
                    scoring_guidance="0: Ignores customer comments; 1: Acknowledges superficially; 2: Paraphrases basic needs; 3: Demonstrates clear empathy and business impact; 4: Synthesizes multi-stakeholder priorities with high emotional intelligence.",
                    keywords=["listen", "understand", "empathy", "acknowledge", "clarify", "validate"],
                    weight=1.0,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="value_prop",
                    criterion_name="Value Proposition & ROI",
                    description="Connects product features directly to customer business outcomes, time savings, and financial return.",
                    scoring_guidance="0: Irrelevant feature list; 1: Generic benefits; 2: Connects some benefits to customer problem; 3: Clear ROI framing with business outcome; 4: Compelling, tailored business case with quantified value.",
                    keywords=["value proposition", "roi", "outcomes", "benefits", "savings", "efficiency", "metrics"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="objection_handling",
                    criterion_name="Objection Handling",
                    description="Responds constructively to objections without becoming defensive or giving immediate unwarranted discounts.",
                    scoring_guidance="0: Cedes price instantly or gets defensive; 1: Weak defense; 2: Probes objection partially; 3: Re-frames around total value and asks clarifying questions; 4: Flawless objection deconstruction and value anchoring.",
                    keywords=["objection", "price", "competitor", "differentiation", "value anchor", "total cost of ownership"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="reasoning",
                    criterion_name="Consultative Dialogue Structure",
                    description="Maintains a coherent, structured, and mutually respectful consultative conversation.",
                    scoring_guidance="0: Disorganized; 1: Choppy; 2: Logical progression; 3: Structured and polished; 4: Exemplary consultative advisory flow.",
                    keywords=["structure", "consultative", "professional", "clarity", "coherence", "flow"],
                    weight=0.8,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=sales_rubric.id,
                    criterion_key="next_steps",
                    criterion_name="Closing & Mutual Action Plan",
                    description="Secures concrete, scheduled commitments and defines mutually beneficial next milestones.",
                    scoring_guidance="0: No next step; 1: Passive/vague follow-up; 2: Proposes a meeting; 3: Concrete next step with date and purpose; 4: Action-oriented mutual plan with milestone commitments.",
                    keywords=["next steps", "close", "mutual action plan", "commitment", "schedule", "decision maker"],
                    weight=1.0,
                    maximum_score=4
                )
            ]
            db.add_all(sales_criteria)
            logger.info("Seeded Sales Track, Rubric, and 6 Criteria.")

        # 3. Seed Bug-Fixing Track
        bug_track = db.query(InterviewTrack).filter(InterviewTrack.id == "bug_fixing").first()
        if not bug_track:
            bug_stages = [
                {
                    "stage_id": "problem_understanding",
                    "title": "Understand the Problem",
                    "sequence": 1,
                    "description": "Analyze system symptoms, constraints, recent changes, and environmental scope.",
                    "prompt_template": "A service has started returning duplicate records after a recent deployment. The database contains unique records, but the API response sometimes contains duplicates. How would you investigate this?",
                    "expected_concepts": ["Clarify symptoms", "Inspect recent release", "Check DB records", "Inspect API code and joins"],
                    "followup_trigger": "jumped_to_assumption",
                    "followup_prompt": "Before inspecting code, what questions would you ask about the deployment diff, error logs, or reproducibility conditions?"
                },
                {
                    "stage_id": "hypothesis_formation",
                    "title": "Form Hypotheses",
                    "sequence": 2,
                    "description": "Brainstorm competing, plausible technical hypotheses covering database, app code, joins, retries, and caching.",
                    "prompt_template": "The database contains strictly unique records, and direct queries to the DB return no duplicates. What plausible hypotheses would you form to explain duplicate records in the API response?",
                    "expected_concepts": ["SQL joins multiplying rows", "Application-level pagination/retry duplication", "In-memory caching collision", "Concurrent requests merging"],
                    "followup_trigger": "single_hypothesis_only",
                    "followup_prompt": "What other system components between the database and the HTTP response could be multiplying or appending records?"
                },
                {
                    "stage_id": "diagnostic_approach",
                    "title": "Diagnostic Steps",
                    "sequence": 3,
                    "description": "Select telemetry, log queries, isolation tests, and reproduction steps to test hypotheses.",
                    "prompt_template": "How would you systematically test whether this issue is caused by SQL table joins versus an application-layer retry mechanism appending pages?",
                    "expected_concepts": ["Log request lifecycle", "Inspect raw SQL emitted by ORM", "Simulate pagination retries", "Inspect retry headers or worker tasks"],
                    "followup_trigger": "vague_logging_only",
                    "followup_prompt": "Specifically, what logs or debugger breakpoints would allow you to confirm whether a retry loop is running twice?"
                },
                {
                    "stage_id": "root_cause_reasoning",
                    "title": "Root Cause Reasoning",
                    "sequence": 4,
                    "description": "Use gathered diagnostic evidence to confirm the exact root cause mechanism.",
                    "prompt_template": "Your diagnostics reveal that an external HTTP client timeout triggers a retry in your background worker, which re-runs the page fetch and appends records to the same response accumulator. What is the root cause?",
                    "expected_concepts": ["Non-idempotent retry logic", "Shared mutable accumulator state", "Missing deduplication key or timeout misconfiguration"],
                    "followup_trigger": "missed_idempotency",
                    "followup_prompt": "Why did the retry cause duplicates rather than replacing the previous failed attempt? What architectural principle was violated?"
                },
                {
                    "stage_id": "proposed_fix",
                    "title": "Proposed Fix",
                    "sequence": 5,
                    "description": "Formulate a clean, robust, and permanent software fix.",
                    "prompt_template": "How would you fix the bug to ensure the retry mechanism is idempotent and duplicate records cannot be appended?",
                    "expected_concepts": ["Idempotent retry with fresh accumulator or deduplication set", "Fix timeout threshold", "Use keyed map / set for unique IDs"],
                    "followup_trigger": "bandaid_fix",
                    "followup_prompt": "How do you ensure your fix doesn't just mask the symptom with a distinct filter, but addresses the retry lifecycle properly?"
                },
                {
                    "stage_id": "regression_testing",
                    "title": "Regression & Verification",
                    "sequence": 6,
                    "description": "Design unit tests, integration tests, idempotency checks, and production monitors.",
                    "prompt_template": "How would you test your fix, and what specific regression tests or monitoring would you put in place to ensure this never recurs in production?",
                    "expected_concepts": ["Unit test mocking network retry", "Integration test with duplicate page simulation", "Alerting on retry frequency or response duplicate anomalies"],
                    "followup_trigger": "manual_testing_only",
                    "followup_prompt": "What automated unit or integration test would you write to simulate a network timeout on page 2 and assert that the final output has zero duplicates?"
                }
            ]

            bug_track = InterviewTrack(
                id="bug_fixing",
                name="Software Engineering Bug-Fixing",
                description="Tests structured troubleshooting and debugging skills through realistic distributed system, database, and backend service defect scenarios.",
                track_type="technical",
                is_active=True,
                stages=bug_stages
            )
            db.add(bug_track)
            db.flush()

            bug_rubric = Rubric(
                track_id="bug_fixing",
                version="1.0",
                name="Software Engineering Debugging Rubric"
            )
            db.add(bug_rubric)
            db.flush()

            bug_criteria = [
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="problem_understanding",
                    criterion_name="Problem Decomposition & Scoping",
                    description="Clarifies symptoms, constraints, blast radius, reproduction steps, and system architecture.",
                    scoring_guidance="0: Misunderstands problem; 1: Superficial grasp; 2: Identifies core symptoms; 3: Thorough system decomposition and constraint checking; 4: Exemplary scoping with clear boundary identification.",
                    keywords=["problem", "symptom", "reproduce", "constraints", "scope", "deployment diff", "logs"],
                    weight=1.0,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="hypothesis_formation",
                    criterion_name="Hypothesis Formation",
                    description="Generates multiple plausible, orthogonal hypotheses across DB, application, caching, and network layers.",
                    scoring_guidance="0: No hypothesis; 1: Single unguided guess; 2: Two plausible ideas; 3: Structured competing hypotheses across stack; 4: Comprehensive, prioritized hypotheses with clear falsifiability.",
                    keywords=["hypothesis", "plausible", "joins", "retry", "cache", "concurrency", "accumulator"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="diagnostic_approach",
                    criterion_name="Diagnostic & Isolation Strategy",
                    description="Proposes targeted tests, query profiling, telemetry inspection, and systematic isolation.",
                    scoring_guidance="0: Random changes without debugging; 1: Vague print statements; 2: Sensible log inspection; 3: Systematic isolation tests distinguishing competing hypotheses; 4: Masterful diagnostic strategy with minimal overhead.",
                    keywords=["diagnostics", "isolation", "logs", "breakpoints", "profiling", "query inspection", "reproduce"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="root_cause_reasoning",
                    criterion_name="Root-Cause Reasoning",
                    description="Narrows down causes logically using evidence rather than guessing; identifies the underlying mechanism.",
                    scoring_guidance="0: Incoherent reasoning; 1: Confuses symptom with cause; 2: Partially identifies mechanism; 3: Rigorous deduction leading to exact defect; 4: Flawless technical causality explanation.",
                    keywords=["root cause", "mechanism", "evidence", "deduction", "idempotency", "underlying defect"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="proposed_fix",
                    criterion_name="Proposed Fix & Architectural Quality",
                    description="Suggests an appropriate, robust, and permanent fix rather than an ad-hoc band-aid.",
                    scoring_guidance="0: Harmful or irrelevant fix; 1: Band-aid hiding symptom; 2: Working fix with minor edge case risk; 3: Robust idempotent solution; 4: Production-grade fix with excellent defensive design.",
                    keywords=["fix", "idempotent", "deduplication", "state", "accumulator", "timeout", "clean architecture"],
                    weight=1.2,
                    maximum_score=4
                ),
                RubricCriterion(
                    rubric_id=bug_rubric.id,
                    criterion_key="regression_testing",
                    criterion_name="Testing Strategy & Regression Prevention",
                    description="Designs automated unit/integration tests for the failure condition and preventative production observability.",
                    scoring_guidance="0: No tests suggested; 1: Manual testing only; 2: Basic happy-path test; 3: Targeted regression test mocking the timeout/retry condition; 4: Exhaustive test suite (unit + integration + chaos) and metrics alerts.",
                    keywords=["testing", "regression test", "mock", "timeout", "automation", "integration test", "monitoring"],
                    weight=1.0,
                    maximum_score=4
                )
            ]
            db.add_all(bug_criteria)
            logger.info("Seeded Bug-Fixing Track, Rubric, and 6 Criteria.")

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        db.close()
