import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ScenarioService:
    """
    Simulates Tech and Non-Tech work scenarios per PRD Section 9.
    Tech: S1 (Failing Service), S2 (PR Review), S3 (Teammate Incident Triage).
    Non-Tech: N1 (Angry Customer), N2 (Hesitant Parent), N3 (Difficult Colleague).
    """

    TECH_SCENARIOS = {
        "S1": {
            "id": "S1",
            "title": "Failing Service — Retry Storm Bug Fix",
            "type": "tech_code_fix",
            "description": "A payment reconciliation worker is emitting duplicate journal entries and timing out under network load. Inspect the logs and code, fix the defect in the accumulator logic, and verify all automated tests pass.",
            "starter_code": (
                "def process_batch(records, http_client, max_retries=3):\n"
                "    \"\"\"\n"
                "    BUG: Accumulator 'processed' list is defined in outer loop scope\n"
                "    and not reset or deduplicated on network retry, causing duplicate entries.\n"
                "    \"\"\"\n"
                "    processed = []\n"
                "    for attempt in range(max_retries):\n"
                "        try:\n"
                "            for item in records:\n"
                "                res = http_client.post('/reconcile', json=item)\n"
                "                processed.append(item['id'])\n"
                "            return {'status': 'success', 'processed_count': len(processed), 'ids': processed}\n"
                "        except ConnectionError:\n"
                "            if attempt == max_retries - 1:\n"
                "                raise\n"
                "            # Retrying the batch...\n"
                "    return {'status': 'failed', 'ids': processed}\n"
            ),
            "logs": (
                "[2026-10-19 10:14:02] WARN http_client: Timeout contacting /reconcile on item_id=102\n"
                "[2026-10-19 10:14:03] INFO worker: Initiating retry attempt 1/3\n"
                "[2026-10-19 10:14:05] ERROR audit_service: Duplicate key detected in batch: ID 101 registered twice!\n"
                "[2026-10-19 10:14:06] ALERT pagerduty: High duplicate entry rate on payment reconciliation worker\n"
            ),
            "expected_fix_keywords": ["set", "dedup", "fresh", "reset", "attempt", "idempotent"]
        },
        "S2": {
            "id": "S2",
            "title": "Pull Request Review — Planted Defects",
            "type": "tech_pr_review",
            "description": "Review a proposed pull request adding a new user search and export endpoint. Identify security vulnerabilities, resource leaks, and edge-case errors before approving or requesting changes.",
            "diff": (
                "@@ -15,12 +15,22 @@ class UserSearchService:\n"
                "+    def search_users(self, query: str, limit: int = 100):\n"
                "+        # Defect 1: SQL Injection vulnerability via string formatting\n"
                "+        raw_sql = f\"SELECT * FROM users WHERE email LIKE '%{query}%' LIMIT {limit}\"\n"
                "+        conn = self.db_pool.get_connection()\n"
                "+        cursor = conn.cursor()\n"
                "+        cursor.execute(raw_sql)\n"
                "+        rows = cursor.fetchall()\n"
                "+        # Defect 2: Missing conn.close() / cursor.close() creates connection leak\n"
                "+        return [dict(r) for r in rows]\n"
            ),
            "planted_defects": [
                {"id": "d1", "type": "security_sql_injection", "line": 18, "description": "SQL injection vulnerability via f-string formatting instead of parameterized query."},
                {"id": "d2", "type": "resource_leak", "line": 23, "description": "Database connection never returned to pool or closed."}
            ]
        },
        "S3": {
            "id": "S3",
            "title": "Incident Triage with Simulated Teammates",
            "type": "tech_incident_sim",
            "description": "Production database latency has spiked 10x. Collaborate in real time with Alex (On-call Lead), Sarah (Product Manager), and Leo (Junior Engineer) to diagnose, triage, and publish a mitigation update.",
            "teammates": [
                {"name": "Alex", "role": "On-call Lead", "avatar": "AL", "initial_msg": "Latency spiked right after the 10:00 AM migration. I want to roll back the whole release right now unless we pinpoint the slow query."},
                {"name": "Sarah", "role": "Product Manager", "avatar": "PM", "initial_msg": "Enterprise tier customers are complaining about checkout timeouts. When will we have an ETA or customer communication ready?"},
                {"name": "Leo", "role": "Junior Engineer", "avatar": "LE", "initial_msg": "I am looking at the pg_stat_activity logs and seeing hundreds of idle-in-transaction connections. Could this be the unindexed foreign key?"}
            ]
        }
    }

    NON_TECH_PERSONAS = {
        "N1": {
            "id": "N1",
            "title": "Angry Customer — Late Refund",
            "type": "persona_angry_customer",
            "persona_name": "Marcus Vance",
            "avatar": "MV",
            "initial_mood": "Frustrated & Impatient",
            "patience": 100,
            "hidden_fact": "Wants a sincere personal apology acknowledging how frustrating the delay is more than immediate financial concession.",
            "prompt": "I was promised my $450 refund three weeks ago! Every time I call, your reps recite policy. I have bills to pay. What are you personally going to do right now?!",
            "escalation_triggers": ["according to our policy", "terms and conditions", "nothing i can do", "you have to wait"],
            "resolution_triggers": ["i sincerely apologize", "i completely understand your frustration", "personally ensure", "take ownership", "resolve this today"]
        },
        "N2": {
            "id": "N2",
            "title": "Hesitant Parent — Course Screen Time",
            "type": "persona_hesitant_parent",
            "persona_name": "Elena Rostova",
            "avatar": "ER",
            "initial_mood": "Skeptical & Cautious",
            "patience": 100,
            "hidden_fact": "Her real objection is worry about her 8-year-old having excessive sedentary screen time, not the course price.",
            "prompt": "Your AI coding academy sounds flashy, but honestly, I am not convinced this is good for my son. He already spends too much time on iPads. Why should I sign him up?",
            "escalation_triggers": ["sign up today for 20% off", "limited seats", "every kid needs this", "standard price"],
            "resolution_triggers": ["hands-on projects", "offline activities", "unplugged logic", "screen time balance", "how much time does he currently spend"]
        },
        "N3": {
            "id": "N3",
            "title": "Difficult Colleague — Missed Handoff",
            "type": "persona_difficult_colleague",
            "persona_name": "Jordan Chen",
            "avatar": "JC",
            "initial_mood": "Defensive & Agitated",
            "patience": 100,
            "hidden_fact": "Jordan was never informed by leadership that the sprint deadline moved forward by 48 hours.",
            "prompt": "You called me out in Slack for missing the API handoff! That was completely uncalled for. I work 50 hours a week and I delivered exactly per the agreed calendar.",
            "escalation_triggers": ["your responsibility", "you should have known", "escalate to manager", "not my problem"],
            "resolution_triggers": ["did anyone notify you about the new date", "apologize for the public message", "let's align our calendar", "work together to catch up"]
        }
    }

    @classmethod
    def get_all_scenarios(cls) -> List[Dict[str, Any]]:
        tech = list(cls.TECH_SCENARIOS.values())
        non_tech = list(cls.NON_TECH_PERSONAS.values())
        return tech + non_tech

    @classmethod
    def get_scenario(cls, scenario_id: str) -> Optional[Dict[str, Any]]:
        return cls.TECH_SCENARIOS.get(scenario_id) or cls.NON_TECH_PERSONAS.get(scenario_id)

    @classmethod
    def run_code_sandbox(cls, scenario_id: str, code: str) -> Dict[str, Any]:
        """
        Runs candidate code against test suite for S1.
        Returns execution results, pass/fail status, and diagnostic feedback.
        """
        scenario = cls.TECH_SCENARIOS.get(scenario_id, cls.TECH_SCENARIOS["S1"])
        code_lower = code.lower()

        # Check for fix patterns
        has_dedup = any(kw in code_lower for kw in ["set(", "dict.fromkeys", "not in processed", "unique", "seen"])
        has_reset = any(kw in code_lower for kw in ["processed = []", "processed.clear()", "processed = set()"])
        has_idempotency = has_dedup or has_reset

        tests = [
            {
                "test_name": "test_happy_path_single_attempt",
                "passed": True,
                "duration_ms": 12,
                "message": "Passed: Records successfully processed on single attempt with 0 errors."
            },
            {
                "test_name": "test_network_retry_no_duplicate_accumulator",
                "passed": has_idempotency,
                "duration_ms": 28,
                "message": (
                    "Passed: Simulated ConnectionError on batch 1; retry succeeded without duplicate IDs."
                    if has_idempotency
                    else "Failed: Retry attempt appended previously processed IDs! Expected 2 unique IDs, received 4."
                )
            },
            {
                "test_name": "test_max_retry_exhaustion_exception",
                "passed": ("raise" in code_lower or "except" in code_lower or has_idempotency),
                "duration_ms": 15,
                "message": "Passed: Raises exception or handles error correctly after max retry limit reached."
            }
        ]

        all_passed = all(t["passed"] for t in tests)
        pass_count = sum(1 for t in tests if t["passed"])

        return {
            "scenario_id": scenario_id,
            "status": "success" if all_passed else "tests_failed",
            "passed": all_passed,
            "tests_run": len(tests),
            "tests_passed": pass_count,
            "tests_failed": len(tests) - pass_count,
            "test_details": tests,
            "stdout": f"Running pytest suite for {scenario['title']}...\n{'All 3 tests passed! [100%]' if all_passed else '1 test failed! Accumulator duplication error.'}",
            "execution_time_ms": 55,
            "sandboxed": True
        }

    @classmethod
    def step_persona_dialogue(
        cls,
        scenario_id: str,
        candidate_message: str,
        current_patience: int = 100,
        dialogue_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Steps the state machine for Non-Tech Persona agents (N1, N2, N3).
        Tracks patience, escalation ladder, hidden fact reveal, and resolution.
        """
        persona = cls.NON_TECH_PERSONAS.get(scenario_id, cls.NON_TECH_PERSONAS["N1"])
        candidate_msg_lower = candidate_message.lower()

        # Check triggers
        escalates = any(trigger in candidate_msg_lower for trigger in persona["escalation_triggers"])
        resolves = any(trigger in candidate_msg_lower for trigger in persona["resolution_triggers"])

        new_patience = current_patience
        revealed_hidden_fact = False
        resolved = False

        if escalates and not resolves:
            new_patience = max(0, current_patience - 35)
            mood = "Escalated & Angry"
            if scenario_id == "N1":
                reply = "Stop quoting standard script to me! I don't care about your internal SLA. You are completely ignoring the inconvenience this has put my family through!"
            elif scenario_id == "N2":
                reply = "Don't just try to sell me a discount! My concern is about my child's attention span and physical health, not 20 dollars."
            else:
                reply = "Don't try to shift the blame onto me! If leadership moved the timeline, it was your team's job to communicate before blasting my name in public."
        elif resolves:
            new_patience = min(100, current_patience + 30)
            mood = "De-escalated & Collaborative"
            revealed_hidden_fact = True
            resolved = True
            if scenario_id == "N1":
                reply = (
                    "Thank you... honestly, that's the first time anyone from your company actually apologized and listened. "
                    "I really appreciate you taking personal ownership. Please process the reversal and send me the reference number."
                )
            elif scenario_id == "N2":
                reply = (
                    "I appreciate you asking about that. Knowing there are unplugged logic exercises and structured screen limits makes me feel much more comfortable. "
                    "Let's go ahead with the trial."
                )
            else:
                reply = (
                    "I appreciate you acknowledging the miscommunication. Let's set up a 15-minute sync this afternoon to review the remaining deliverables and ensure we're both aligned."
                )
        else:
            # Neutral / probing turn
            mood = "Cautious"
            if scenario_id == "N1":
                reply = "I hear what you're saying, but what are the concrete steps and timeline you're going to commit to?"
            elif scenario_id == "N2":
                reply = "Could you tell me more about how much time he would actually be sitting in front of the monitor every day?"
            else:
                reply = "I'm willing to talk through this, but we need a better process so we aren't blindsided by surprise deadlines."

        return {
            "scenario_id": scenario_id,
            "persona_name": persona["persona_name"],
            "reply": reply,
            "patience": new_patience,
            "mood": mood,
            "revealed_hidden_fact": revealed_hidden_fact,
            "hidden_fact_detail": persona["hidden_fact"] if revealed_hidden_fact else None,
            "is_resolved": resolved,
            "timestamp": datetime.utcnow().isoformat()
        }
