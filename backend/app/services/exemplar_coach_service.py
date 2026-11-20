import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

EXEMPLAR_BANK: Dict[str, Dict[str, Any]] = {
    # 1. Software Engineering: Hash Maps
    "Explain how a hash map works.": {
        "exemplar_answer": (
            "A hash map is an associative data structure storing key-value pairs with O(1) average-time complexity. "
            "Internally, it passes the key through a hash function to generate an integer hash code, which is mapped via modulo arithmetic "
            "to a bucket array index. When two keys hash to the same bucket, collisions are handled using separate chaining—such as linked "
            "lists or balanced trees—or open addressing with linear or quadratic probing. To prevent degradation from high bucket density, "
            "the hash map monitors its load factor—typically 0.75—and dynamically doubles the bucket array, rehashing all entries when exceeded."
        ),
        "key_takeaways": [
            "O(1) average lookup/insert complexity",
            "Hash function and modulo bucket indexing",
            "Collision resolution: Separate chaining vs Open addressing",
            "Load factor threshold and dynamic rehashing"
        ],
        "speech_coach_feedback": (
            "When answering technical fundamentals, lead directly with the core definition and time complexity in your first sentence. "
            "Speak at a measured 135 to 145 words per minute. Pause for half a second before explaining collision resolution to signal "
            "transition from mechanics to edge-case handling. Avoid filler phrases like 'basically' or 'you know', and articulate technical "
            "terms like 'modulo arithmetic' and 'load factor' with crisp vocal projection."
        )
    },

    # 2. Software Engineering: Concurrency & Threads
    "Describe the difference between processes and threads.": {
        "exemplar_answer": (
            "The fundamental distinction lies in memory isolation and resource ownership. A process is an independent execution environment "
            "with its own dedicated virtual memory space, heap, file descriptors, and OS privileges. In contrast, a thread is a lightweight "
            "unit of execution that lives inside a process, sharing that process's memory space, code segment, and open handles while retaining "
            "its own call stack, registers, and program counter. Inter-process communication requires explicit OS mechanisms like sockets or "
            "pipes and incurs heavy context-switching penalties. Threads communicate with near-zero latency through shared memory, but require "
            "strict synchronization using mutexes, semaphores, or atomic operations to prevent race conditions."
        ),
        "key_takeaways": [
            "Memory isolation: Dedicated address space vs shared memory",
            "Resource ownership and process isolation",
            "Context-switch overhead differences",
            "Synchronization primitives: Mutexes, locks, atomic operations"
        ],
        "speech_coach_feedback": (
            "Structure this comparison using a clear two-part contrast: first address memory and isolation, then address communication and "
            "synchronization trade-offs. Use a calm, authoritative pitch. Rather than rushing through definitions, let your voice drop slightly "
            "on closing statements like 'prevent race conditions' to project senior-level certainty."
        )
    },

    # 3. Bug Fixing Track: Duplicate API Records
    "An API service started returning duplicate records after a deployment. How do you isolate the root cause?": {
        "exemplar_answer": (
            "I would isolate this systematically across three layers: observation, data tier verification, and application logic. "
            "First, I inspect service logs and tracing tags around the recent deployment commit to check for retry bursts or idempotency key "
            "mismatches. Next, I query the database directly: if records are unique at the storage layer, the bug is purely in application serialization "
            "or pagination accumulation. If duplicate rows exist in the database, I inspect insert paths to see whether missing unique constraints "
            "or unhandled idempotent replay loops caused double writes. Finally, I write a failing integration test reproducing the exact payload "
            "to confirm the hypothesis before deploying a fix."
        ),
        "key_takeaways": [
            "Systematic layer decomposition: DB vs App vs Network",
            "Idempotency and retry-loop analysis",
            "Telemetry, request-tracing, and git commit diffs",
            "Reproduction via automated regression tests"
        ],
        "speech_coach_feedback": (
            "Adopt an emergency incident commander tone—calm, structured, and decisive. Number your troubleshooting steps aloud: "
            "'First... Second... Finally...'. This verbal scaffolding prevents hesitation pauses and convinces the interviewer that you "
            "remain methodical under production incident pressure."
        )
    },

    # 4. Sales Track: Price Objection
    "You are speaking with a prospective client who says your SaaS product looks great but is 25% over their budget. How would you handle this?": {
        "exemplar_answer": (
            "I acknowledge the budget constraint without immediately offering an unearned discount. First, I validate their concern: "
            "'I completely respect that budget boundaries are critical for your team.' Next, I reopen discovery to uncover the cost of inaction: "
            "'Before we discuss commercial terms, let's revisit the 12 hours your engineering team loses every week to manual deployments. "
            "At standard burdened rates, that downtime costs your business roughly $95,000 annually.' Finally, if budget is genuinely fixed, "
            "I explore scope adjustments—such as phased rollout, fewer initial seats, or annual prepayment—to preserve our pricing integrity while "
            "delivering immediate ROI."
        ),
        "key_takeaways": [
            "Empathetic validation without premature discounting",
            "Re-anchoring on business value and cost of inaction",
            "Quantified ROI calculation",
            "Creative scope concessions (seats, phasing, billing cadence)"
        ],
        "speech_coach_feedback": (
            "Consultative sales requires an empathetic yet assertive vocal delivery. Modulate your tone to sound like a trusted advisor, not a "
            "transactional vendor. Keep your pace steady at 130 WPM—rushing when talking about money sounds defensive. Pause cleanly after framing "
            "the $95,000 cost of inaction to let the financial gravity sink in."
        )
    }
}

# Invigilator Demo Showcase Data: Pre-packaged pairs of Flawed vs Exemplar Responses
INVIGILATOR_DEMO_QUESTIONS = [
    {
        "id": "demo_q1",
        "category": "System Design & Distributed Systems",
        "question": "How do you design an idempotent payment processing endpoint that safely handles network retries and duplicate webhooks?",
        "suboptimal": {
            "candidate_answer": (
                "Um, so basically for payment idempotency... like, you should probably use an idempotency key, I guess? "
                "The client sends a UUID, and then, um, we check if the key is in our database or Redis. If it's there, we just don't charge "
                "them again. If it's not there, we call Stripe or PayPal. But yeah, if the network cuts out, um, like sometimes it might fail "
                "or double charge if two requests come at the exact same millisecond, but that's pretty rare honestly."
            ),
            "score": 2.2,
            "ci_band": "[1.9 - 2.5]",
            "speaking_wpm": 168,
            "filler_count": 7,
            "rubric_assessment": [
                {"criterion": "Idempotency Architecture", "status": "Partial", "note": "Mentions UUID key but fails to address atomic lock semantics."},
                {"criterion": "Concurrency & Race Conditions", "status": "Failed", "note": "Dismissed simultaneous double-charge race conditions as 'rare'."},
                {"criterion": "Communication & Tone", "status": "Needs Improvement", "note": "High filler density (7 fillers) and speculative hedging ('I guess')."}
            ],
            "ai_critique": (
                "The candidate identifies the concept of an idempotency key but completely ignores atomic locking (e.g. Redis SETNX), "
                "database status state-machines (PENDING vs SUCCEEDED), and payload fingerprinting. Dismissing concurrent race conditions "
                "in payments is a major red flag for senior engineering roles."
            ),
            "speech_coaching": (
                "Your verbal delivery was rushed at 168 WPM and littered with 7 filler words ('um', 'like', 'basically'). "
                "Replace filler words with deliberate pauses. Instead of ending sentences with an upward question inflection ('I guess?'), "
                "ground your voice with declarative statements."
            )
        },
        "exemplar": {
            "candidate_answer": (
                "To guarantee strict idempotency under concurrent retries, I implement a three-tiered architecture: atomic distributed locking, "
                "a stateful transaction ledger, and payload fingerprinting. When a request arrives with an Idempotency-Key header, we first hash "
                "the request payload and attempt an atomic SETNX lock in Redis with a 30-second TTL. If the key exists with a COMPLETED status, "
                "we immediately replay the cached response with zero downstream side-effects. If a duplicate request arrives while the status is "
                "still PENDING, we return HTTP 409 Conflict with a Retry-After header. Finally, database writes use ACID transactions with unique "
                "database constraints on the idempotency key, ensuring that even in the event of cache eviction, double charges are physically impossible."
            ),
            "score": 4.9,
            "ci_band": "[4.7 - 5.0]",
            "speaking_wpm": 140,
            "filler_count": 0,
            "rubric_assessment": [
                {"criterion": "Idempotency Architecture", "status": "Exemplary", "note": "Comprehensive 3-tier pattern with TTL and atomic locks."},
                {"criterion": "Concurrency & Race Conditions", "status": "Exemplary", "note": "Explicit 409 Conflict handling and DB-level unique constraints."},
                {"criterion": "Communication & Tone", "status": "Exemplary", "note": "Authoritative pacing (140 WPM), 0 fillers, and crisp technical taxonomy."}
            ],
            "ai_critique": (
                "Outstanding response demonstrating production-grade architecture. Covers in-flight concurrency, HTTP status semantics, "
                "payload integrity hashing, and multi-layered defense with database constraints."
            ),
            "speech_coaching": (
                "Perfect executive pacing at 140 WPM. The speaker partitions their answer into three clear phases ('First... If duplicate... "
                "Finally...'), keeping the listener engaged without any verbal hesitation."
            )
        }
    },
    {
        "id": "demo_q2",
        "category": "Software Engineering Troubleshooting",
        "question": "A production microservice latency spiked from 50ms to 2.4 seconds after a peak traffic event. How do you triage this?",
        "suboptimal": {
            "candidate_answer": (
                "Well, I would probably just restart the service or restart the pods in Kubernetes first to see if that fixes it. "
                "If it doesn't, like, maybe the CPU is high or something? So I'd check Datadog. If the CPU is fine, um, it could be a slow query "
                "or the database is hanging. I'd ask the team if anyone pushed bad code recently and maybe rollback the whole release."
            ),
            "score": 2.4,
            "ci_band": "[2.1 - 2.7]",
            "speaking_wpm": 155,
            "filler_count": 5,
            "rubric_assessment": [
                {"criterion": "Root Cause Triage", "status": "Weak", "note": "Relies on blind restarts and immediate rollback without telemetry triage."},
                {"criterion": "Observability Rigor", "status": "Partial", "note": "Vague mention of checking CPU rather than latency distributed traces."},
                {"criterion": "Production Safety", "status": "Failed", "note": "Premature restart destroys crash logs and thread dump evidence."}
            ],
            "ai_critique": (
                "Blindly restarting instances in production destroys active memory heap dumps, thread stack traces, and database connection "
                "state, making subsequent post-mortems impossible. A structured engineer first inspects distributed trace percentiles (p99) "
                "and connection pool saturation."
            ),
            "speech_coaching": (
                "Avoid speculative phrases like 'maybe the CPU is high or something'. Speak in concrete procedural hypotheses: "
                "'Hypothesis 1: Connection pool starvation. Hypothesis 2: Downstream database lock contention.' This commands immediate authority."
            )
        },
        "exemplar": {
            "candidate_answer": (
                "I approach this with an evidence-driven triage framework, avoiding disruptive actions like blind restarts that destroy forensic evidence. "
                "First, I isolate the blast radius by inspecting p95 and p99 latency heatmaps broken down by endpoint and availability zone. "
                "Second, using distributed tracing in Jaeger or Datadog, I inspect flame graphs to see whether the 2.3-second delta originates in application "
                "compute, garbage collection pauses, or downstream dependencies like database query locks or Redis connection pool exhaustion. "
                "If downstream saturation is observed, I throttle background worker jobs and enable circuit breakers to shed non-critical load. "
                "Once latency stabilizes, I capture a thread and heap dump, document the timeline, and schedule an RCA with permanent mitigation steps."
            ),
            "score": 4.8,
            "ci_band": "[4.6 - 5.0]",
            "speaking_wpm": 136,
            "filler_count": 0,
            "rubric_assessment": [
                {"criterion": "Root Cause Triage", "status": "Exemplary", "note": "Methodical telemetry triage prioritizing evidence preservation."},
                {"criterion": "Observability Rigor", "status": "Exemplary", "note": "Explicit p99 latency decomposition, flame graphs, and pool metrics."},
                {"criterion": "Production Safety", "status": "Exemplary", "note": "Applies circuit breaking and traffic shedding before capturing dumps."}
            ],
            "ai_critique": (
                "Exemplary technical depth. Correctly recognizes that p99 latency spikes during peak traffic often stem from connection pool "
                "contention or GC lockups rather than raw CPU utilization. Preserves diagnostic state while mitigating blast radius."
            ),
            "speech_coaching": (
                "Superb pacing and cadence. Notice the confident, low-stress vocal cadence that reassures incident teams. Words like "
                "'evidence-driven triage framework' establish instant seniority."
            )
        }
    },
    {
        "id": "demo_q3",
        "category": "Enterprise Sales & Consultative Negotiation",
        "question": "An enterprise prospect states: 'Your platform is 40% more expensive than Competitor X and we have tight budget caps this quarter.' How do you respond?",
        "suboptimal": {
            "candidate_answer": (
                "Um, yeah, I totally get that competitor X is cheaper. But honestly, their software is pretty buggy and their customer support "
                "is terrible. If price is really a dealbreaker, I can talk to my VP and probably get you a 25% discount or match their price "
                "if you can sign the contract by this Friday."
            ),
            "score": 1.9,
            "ci_band": "[1.6 - 2.3]",
            "speaking_wpm": 160,
            "filler_count": 4,
            "rubric_assessment": [
                {"criterion": "Objection Handling", "status": "Failed", "note": "Immediately offers unearned discount and attacks competitor."},
                {"criterion": "Value Framing", "status": "Failed", "note": "Zero ROI or total cost of ownership justification provided."},
                {"criterion": "Professional Integrity", "status": "Weak", "note": "Trash-talking competitors undermines enterprise trust."}
            ],
            "ai_critique": (
                "Disparaging competitor products looks unprofessional and defensive to enterprise buyers. Offering a massive 25% discount "
                "in your very first sentence damages brand integrity and signals that the original pricing was arbitrary."
            ),
            "speech_coaching": (
                "Do not sound panicky when confronted with price resistance. Slow down your speaking tempo to 128 WPM. Speak with calm "
                "curiosity: ask discovery questions instead of immediately conceding margin."
            )
        },
        "exemplar": {
            "candidate_answer": (
                "I appreciate you being transparent about budget constraints. When prospective partners evaluate us alongside Competitor X, "
                "the initial headline subscription is indeed 30 to 40 percent higher. That difference reflects total cost of ownership: "
                "our automated data pipelines eliminate approximately 15 engineering hours weekly per squad, whereas Competitor X requires "
                "dedicated ongoing custom scripting and third-party connector subscriptions. When factoring in implementation hours and maintenance "
                "overhead, our clients typically recoup the cost differential within the first 90 days. That said, to align with your quarterly "
                "budget cap, we could structure this as a phased deployment—beginning with your core tier-1 team this quarter and expanding "
                "as cost savings are realized."
            ),
            "score": 4.9,
            "ci_band": "[4.7 - 5.0]",
            "speaking_wpm": 134,
            "filler_count": 0,
            "rubric_assessment": [
                {"criterion": "Objection Handling", "status": "Exemplary", "note": "Validates pricing difference cleanly and reframes on TCO."},
                {"criterion": "Value Framing", "status": "Exemplary", "note": "Quantifies 15 hrs/squad engineering savings with 90-day payback."},
                {"criterion": "Professional Integrity", "status": "Exemplary", "note": "Respectful of competitor while offering structured phasing."}
            ],
            "ai_critique": (
                "Masterclass in consultative B2B negotiation. Reframes raw subscription cost into Total Cost of Ownership (TCO), proves a 90-day "
                "payback horizon, and solves the quarterly cash-flow problem via phased adoption without sacrificing contract value."
            ),
            "speech_coaching": (
                "Vocal presence is warm, confident, and consultative. By saying 'I appreciate you being transparent' with steady pitch and "
                "zero fillers, the speaker establishes equal peer footing with the executive buyer."
            )
        }
    }
]

class ExemplarCoachService:
    @staticmethod
    def get_exemplar_and_coach(question_text: str, candidate_transcript: str = "") -> Dict[str, Any]:
        """
        Retrieves the exact curated exemplar answer and delivery coach tips for the question,
        or dynamically generates structured STAR answers and vocal delivery advice.
        """
        # Exact match
        for q_key, data in EXEMPLAR_BANK.items():
            if q_key.lower() in question_text.lower() or question_text.lower() in q_key.lower():
                return data

        # Keywords fallback for common domain topics
        q_lower = question_text.lower()
        if "hash" in q_lower or "map" in q_lower or "lookup" in q_lower:
            return EXEMPLAR_BANK["Explain how a hash map works."]
        elif "process" in q_lower or "thread" in q_lower or "concurrency" in q_lower:
            return EXEMPLAR_BANK["Describe the difference between processes and threads."]
        elif "duplicate" in q_lower or "bug" in q_lower or "isolate" in q_lower or "retry" in q_lower:
            return EXEMPLAR_BANK["An API service started returning duplicate records after a deployment. How do you isolate the root cause?"]
        elif "budget" in q_lower or "expensive" in q_lower or "price" in q_lower or "discount" in q_lower:
            return EXEMPLAR_BANK["You are speaking with a prospective client who says your SaaS product looks great but is 25% over their budget. How would you handle this?"]

        # Default high-quality structured framework
        return {
            "exemplar_answer": (
                f"In addressing this question, an exemplar approach follows the STAR framework: first, specify the technical context "
                f"and requirements; second, detail the architectural mechanism and design choices; third, walk through the execution and "
                f"trade-offs considered; and fourth, conclude with measurable impact and risk mitigation."
            ),
            "key_takeaways": [
                "Structured STAR/CAR response progression",
                "Explicit trade-off evaluation (e.g. latency vs consistency)",
                "Quantified metrics and measurable outcomes",
                "Concise, definitive closing statement"
            ],
            "speech_coach_feedback": (
                "Deliver your answer with steady executive cadence between 130 and 145 WPM. Pause deliberately for 0.5 seconds between "
                "key conceptual points rather than bridging with 'um' or 'like'. Ground your final sentence with a slight downward pitch "
                "to convey confidence and technical resolution."
            )
        }

    @staticmethod
    def get_invigilator_demo_data() -> List[Dict[str, Any]]:
        return INVIGILATOR_DEMO_QUESTIONS
