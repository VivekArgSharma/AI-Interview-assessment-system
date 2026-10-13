from typing import Dict, List
from ..schemas.assessment import QuestionItem, RoleQuestions, RubricCriterion

QUESTION_BANK: Dict[str, RoleQuestions] = {
    "software_engineer": RoleQuestions(
        role_id="software_engineer",
        role_name="Software Engineer",
        description="Assesses core computer science fundamentals, system design thinking, and engineering problem solving.",
        question_count=5,
        questions=[
            QuestionItem(
                id="se_1",
                role="software_engineer",
                question="Explain how a hash map works.",
                reference_answer=(
                    "A hash map is an associative data structure that stores key-value pairs. It uses a hash function "
                    "to compute an integer hash code from the key, which is then mapped via modulo arithmetic to an "
                    "index in an underlying array or bucket array. In the ideal case, lookups, insertions, and deletions "
                    "execute in O(1) constant average time. When two different keys hash to the same bucket index, a collision occurs. "
                    "Collisions are resolved using strategies like separate chaining (storing items in linked lists or trees at each bucket) "
                    "or open addressing (probing for the next vacant slot such as linear or quadratic probing). As items increase, "
                    "the load factor is monitored, and the table is resized and rehashed to maintain O(1) performance."
                ),
                reference_concepts=[
                    "Hash function computing hash codes",
                    "Bucket indexing using modulo arithmetic",
                    "Collision resolution (separate chaining or open addressing)",
                    "O(1) average-case time complexity for search, insert, and delete",
                    "Load factor and dynamic resizing/rehashing"
                ],
                rubric=[
                    RubricCriterion(
                        id="se_1_c1",
                        title="Hash Function & Mapping",
                        description="Explains how a hash function converts keys into indices or bucket addresses.",
                        keywords=["hash function", "hash code", "bucket", "index", "modulo", "map keys"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_1_c2",
                        title="Key-Value Storage Mechanics",
                        description="Describes associative storage of key-value pairs within an underlying array.",
                        keywords=["key-value", "key", "value", "underlying array", "storage", "pairs"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_1_c3",
                        title="Collision Handling Strategies",
                        description="Identifies collisions and mentions resolution methods such as chaining or open addressing.",
                        keywords=["collision", "chaining", "linked list", "open addressing", "probe", "probing", "tree"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_1_c4",
                        title="Time Complexity & Scaling",
                        description="Accurately states O(1) average time complexity and notes worst case or load factor resizing.",
                        keywords=["O(1)", "constant time", "time complexity", "average case", "load factor", "rehash", "resizing"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="se_2",
                role="software_engineer",
                question="Describe the difference between processes and threads.",
                reference_answer=(
                    "A process is an independent execution unit with its own dedicated memory address space, heap, "
                    "file handles, and operating system resources, managed by the kernel. A thread, often called a lightweight process, "
                    "is the smallest sequence of programmed instructions that can be managed independently by a scheduler. "
                    "Multiple threads exist within the same process and share that process's address space, code segment, and heap, "
                    "while retaining their own individual call stack, registers, and program counter. Inter-process communication (IPC) "
                    "requires explicit mechanisms like pipes, sockets, or shared memory and involves high context switching overhead. "
                    "In contrast, thread communication is fast because memory is shared, but it requires synchronization mechanisms "
                    "like mutexes, semaphores, or locks to prevent race conditions."
                ),
                reference_concepts=[
                    "Independent memory address space for processes versus shared memory for threads",
                    "Resource ownership and process isolation",
                    "Context switching overhead comparison",
                    "Thread synchronization and race conditions",
                    "Inter-process communication (IPC) mechanisms"
                ],
                rubric=[
                    RubricCriterion(
                        id="se_2_c1",
                        title="Memory & Resource Isolation",
                        description="Explains that processes have separate address spaces while threads share process memory.",
                        keywords=["memory", "address space", "shared memory", "isolated", "heap", "stack"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_2_c2",
                        title="Context Switching Overhead",
                        description="Notes that context switching between processes is heavier than between threads.",
                        keywords=["context switch", "overhead", "lightweight", "heavyweight", "performance", "cpu"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_2_c3",
                        title="Communication Mechanisms",
                        description="Compares shared memory in threads with IPC (sockets, pipes) in processes.",
                        keywords=["ipc", "inter-process", "sockets", "pipes", "shared", "communication"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_2_c4",
                        title="Synchronization & Concurrency Hazards",
                        description="Mentions race conditions, locks, mutexes, or synchronization required for multi-threading.",
                        keywords=["race condition", "mutex", "lock", "synchronization", "deadlock", "safety"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="se_3",
                role="software_engineer",
                question="How would you debug a slow API?",
                reference_answer=(
                    "Debugging a slow API follows a systematic, metrics-driven approach. First, replicate and reproduce "
                    "the issue using synthetic requests or inspecting Application Performance Monitoring (APM) tools like Datadog, "
                    "Prometheus, or New Relic to inspect latency percentiles (p95, p99). Next, trace request execution through distributed "
                    "tracing (e.g., OpenTelemetry) to isolate where time is spent: network latency, API gateway, application server, "
                    "external downstream dependencies, or database queries. Check database queries for unindexed lookups, N+1 query problems, "
                    "or connection pool exhaustion using EXPLAIN ANALYZE. In the application code, look for CPU bottlenecks, heavy blocking I/O, "
                    "or inefficient serialization. Finally, consider architectural mitigations such as Redis caching, pagination, async processing, "
                    "or horizontal scaling, and verify the fix by load testing."
                ),
                reference_concepts=[
                    "APM tools and latency breakdown (p95/p99)",
                    "Distributed tracing and isolating latency bottlenecks",
                    "Database query profiling (EXPLAIN, indexing, N+1 queries)",
                    "Application profiling (CPU, blocking I/O, memory)",
                    "Resolution strategies (caching, indexing, pagination, load testing)"
                ],
                rubric=[
                    RubricCriterion(
                        id="se_3_c1",
                        title="Systematic Profiling & APM",
                        description="Mentions observing metrics, logs, APM, or measuring latency percentiles.",
                        keywords=["apm", "profiler", "latency", "metrics", "logs", "datadog", "prometheus", "percentile"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_3_c2",
                        title="Database Inspection",
                        description="Identifies database issues like missing indexes, slow queries, or N+1 queries.",
                        keywords=["database", "query", "index", "sql", "slow query", "n+1", "explain analyze"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_3_c3",
                        title="Downstream & Network Isolation",
                        description="Considers external services, network overhead, or microservice dependencies.",
                        keywords=["network", "downstream", "external api", "microservice", "distributed trace", "io"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_3_c4",
                        title="Actionable Optimization Strategies",
                        description="Proposes valid solutions such as caching (Redis), pagination, or async execution.",
                        keywords=["cache", "caching", "redis", "paginate", "async", "background", "optimize"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="se_4",
                role="software_engineer",
                question="Explain the time complexity of binary search.",
                reference_answer=(
                    "Binary search requires a sorted array or list. It works by repeatedly dividing the search interval "
                    "in half by comparing the target value to the middle element. If the target equals the middle element, the search succeeds. "
                    "If the target is smaller, the search continues in the left subarray; if larger, it continues in the right subarray. "
                    "Because the search space of size N is halved at each step (N, N/2, N/4, ..., 1), the number of comparisons k satisfies "
                    "N / (2^k) = 1, giving k = log2(N). Therefore, the worst-case and average-case time complexity is O(log N). "
                    "The best-case time complexity is O(1) when the target is at the midpoint on the first comparison. "
                    "The space complexity is O(1) for iterative implementations, and O(log N) auxiliary call stack space for standard recursion."
                ),
                reference_concepts=[
                    "Precondition of sorted input collection",
                    "Halving search interval at each step",
                    "Mathematical derivation N / 2^k = 1 leading to O(log N)",
                    "Best case O(1) vs worst/average case O(log N)",
                    "Iterative O(1) vs recursive O(log N) space complexity"
                ],
                rubric=[
                    RubricCriterion(
                        id="se_4_c1",
                        title="Precondition Requirement",
                        description="Explicitly states that the array or dataset must be sorted.",
                        keywords=["sorted", "ordered", "array", "in order"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_4_c2",
                        title="Divide-and-Conquer Halving Principle",
                        description="Explains how the search space is divided in half at each iteration by comparing the middle element.",
                        keywords=["divide", "half", "halved", "middle", "midpoint", "left", "right"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_4_c3",
                        title="Logarithmic Derivation",
                        description="Explains mathematically why halving yields logarithmic O(log n) time complexity.",
                        keywords=["O(log n)", "logarithmic", "log n", "time complexity", "derivation", "powers of 2"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_4_c4",
                        title="Space Complexity / Edge Cases",
                        description="Mentions space complexity (iterative O(1) vs recursive) or best case O(1).",
                        keywords=["space complexity", "best case", "O(1)", "iterative", "recursive", "call stack"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="se_5",
                role="software_engineer",
                question="Describe a technical project you have worked on.",
                reference_answer=(
                    "A strong technical project explanation follows the STAR framework (Situation, Task, Action, Result). "
                    "It clearly outlines the core business or technical problem, the architectural design decisions, "
                    "the technology stack chosen (such as React, FastAPI, PostgreSQL, Docker), specific technical challenges "
                    "overcome (such as scaling data pipelines, managing state, or optimizing model inference latency), "
                    "and quantifiable outcomes or metrics achieved (such as reduced response latency by 40%, improved throughput, "
                    "or successful deployment with unit test coverage)."
                ),
                reference_concepts=[
                    "Clear problem formulation and technical context",
                    "Architecture and technology stack selection rationale",
                    "Key technical hurdles and implementation solutions",
                    "Quantifiable results, metrics, and learnings"
                ],
                rubric=[
                    RubricCriterion(
                        id="se_5_c1",
                        title="Problem Statement & Scope",
                        description="Clearly states the purpose, requirements, and scope of the project.",
                        keywords=["problem", "goal", "built", "project", "application", "system", "designed"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_5_c2",
                        title="Architecture & Technology Selection",
                        description="Discusses specific technologies, libraries, or architectural patterns used.",
                        keywords=["architecture", "stack", "frontend", "backend", "database", "api", "framework", "technologies"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_5_c3",
                        title="Technical Challenges & Solutions",
                        description="Explains complex challenges encountered and how they were resolved engineering-wise.",
                        keywords=["challenge", "problem", "solution", "debugged", "optimized", "implemented", "hurdle"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="se_5_c4",
                        title="Results, Testing & Reflection",
                        description="Summarizes outcomes, performance improvements, test verification, or key takeaways.",
                        keywords=["result", "outcome", "performance", "metric", "tested", "learned", "impact", "users"],
                        weight=1.0
                    )
                ]
            )
        ]
    ),
    "customer_support": RoleQuestions(
        role_id="customer_support",
        role_name="Customer Support Specialist",
        description="Assesses active listening, empathy, de-escalation, structured troubleshooting, and customer-first communication.",
        question_count=5,
        questions=[
            QuestionItem(
                id="cs_1",
                role="customer_support",
                question="How would you handle an angry customer?",
                reference_answer=(
                    "When dealing with an angry customer, I use the HEAT model: Hear, Empathize, Apologize, and Take Action. "
                    "First, I actively listen without interrupting, letting the customer express their frustration and validating their emotions. "
                    "Second, I demonstrate genuine empathy and acknowledge the impact of the problem on their work or day. "
                    "Third, I offer a sincere apology for the disruption and frustration, maintaining a calm, professional tone without becoming defensive. "
                    "Fourth, I ask clarifying questions to diagnose the root issue, outline concrete steps I will immediately take to resolve it, "
                    "and provide clear timelines. Finally, I follow up to verify the resolution met their satisfaction and document the issue to prevent recurrence."
                ),
                reference_concepts=[
                    "Active listening without interruption",
                    "Empathy and emotional validation",
                    "Calm de-escalation and professional demeanor",
                    "Action-oriented problem resolution with clear timeframes",
                    "Follow-up and satisfaction verification"
                ],
                rubric=[
                    RubricCriterion(
                        id="cs_1_c1",
                        title="Active Listening & Composure",
                        description="Highlights listening patiently without interrupting, staying calm and professional.",
                        keywords=["listen", "calm", "patient", "interrupt", "composure", "professional"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_1_c2",
                        title="Empathy & Validation",
                        description="Acknowledges the customer's frustration and validates their experience with empathy.",
                        keywords=["empathy", "understand", "frustration", "validate", "apologize", "sorry"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_1_c3",
                        title="Structured Action Plan",
                        description="Outlines clear, practical steps and timelines to resolve the underlying issue.",
                        keywords=["action", "resolve", "steps", "solution", "timeline", "investigate", "fix"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_1_c4",
                        title="Follow-Up & Documentation",
                        description="Mentions checking back with the customer or logging feedback for continuous improvement.",
                        keywords=["follow up", "document", "satisfaction", "prevent", "ticket", "feedback"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="cs_2",
                role="customer_support",
                question="Describe how you would explain a technical issue to a non-technical person.",
                reference_answer=(
                    "Explaining a technical issue to a non-technical user requires translating jargon into clear, relatable language. "
                    "I begin by understanding the user's perspective and current knowledge level. Instead of acronyms and internal terms, "
                    "I use familiar real-world analogies (for instance, comparing DNS lookup to looking up a contact in a phonebook, "
                    "or caching to keeping frequently used papers on top of a desk). I focus on the 'why' and 'what it means for them' "
                    "rather than intricate technical details. I break down any required actions into small, numbered, step-by-step instructions. "
                    "Throughout the explanation, I pause, check for understanding, encourage questions, and reassure them that they can reach out if needed."
                ),
                reference_concepts=[
                    "Avoiding jargon and complex technical acronyms",
                    "Using intuitive real-world analogies",
                    "Focusing on user impact and practical next steps",
                    "Iterative checking for comprehension",
                    "Patient, encouraging tone"
                ],
                rubric=[
                    RubricCriterion(
                        id="cs_2_c1",
                        title="Jargon Removal",
                        description="Avoids confusing acronyms or technical jargon in favor of plain language.",
                        keywords=["jargon", "plain language", "simple terms", "clear", "acronyms"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_2_c2",
                        title="Use of Analogies & Metaphors",
                        description="Uses real-world analogies or visual metaphors to bridge knowledge gaps.",
                        keywords=["analogy", "metaphor", "example", "relatable", "real-world", "compare"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_2_c3",
                        title="Step-by-Step Guidance",
                        description="Breaks instructions down into actionable, sequential steps.",
                        keywords=["step by step", "instructions", "simple steps", "actionable", "guide"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_2_c4",
                        title="Comprehension Check & Patience",
                        description="Verifies understanding and invites questions patiently.",
                        keywords=["check understanding", "questions", "patient", "pause", "confirm", "feedback"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="cs_3",
                role="customer_support",
                question="How would you prioritize multiple urgent customer requests?",
                reference_answer=(
                    "When handling competing urgent requests, I use a triage matrix based on severity, business impact, "
                    "and Service Level Agreements (SLAs). First, I evaluate the impact: an outage affecting an entire organization or critical payment flow "
                    "takes precedence over an individual account question. Second, I check SLA deadlines to ensure no critical commitment breaches. "
                    "Third, for all incoming requests, I immediately send a prompt acknowledgment so no customer feels ignored. "
                    "Fourth, I leverage quick wins or pre-built knowledge base resources where appropriate, and collaborate with team members "
                    "or escalate to engineering when necessary. Finally, I maintain transparent communication by keeping affected customers updated with realistic ETAs."
                ),
                reference_concepts=[
                    "Triage based on severity, impact, and SLA requirements",
                    "Immediate acknowledgment to manage customer expectations",
                    "Delegation, team coordination, or technical escalation",
                    "Clear status updates and realistic ETAs"
                ],
                rubric=[
                    RubricCriterion(
                        id="cs_3_c1",
                        title="Impact & Severity Assessment",
                        description="Evaluates scope of impact (system outage vs individual user) and urgency.",
                        keywords=["severity", "impact", "urgency", "triage", "outage", "priority", "critical"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_3_c2",
                        title="SLA Compliance",
                        description="References SLAs, response times, or contractual commitments.",
                        keywords=["sla", "service level", "deadline", "timeframe", "commitments"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_3_c3",
                        title="Customer Acknowledgment & Transparency",
                        description="Acknowledges all customers quickly and sets realistic ETA expectations.",
                        keywords=["acknowledge", "eta", "transparent", "update", "expectations", "communication"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_3_c4",
                        title="Escalation & Team Collaboration",
                        description="Knows when to escalate to engineering or collaborate with teammates.",
                        keywords=["escalate", "team", "engineer", "collaborate", "delegate", "resources"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="cs_4",
                role="customer_support",
                question="What would you do if you did not know the answer to a customer's question?",
                reference_answer=(
                    "If I don't know the answer to a customer's question, I never guess or provide inaccurate information. "
                    "First, I remain transparent and honest, telling the customer something like: 'That is an excellent question. "
                    "To ensure I give you the most accurate answer, let me investigate this with our documentation and technical team.' "
                    "Second, I consult internal resources including our knowledge base, ticket archives, and senior team members. "
                    "Third, I set a clear expectation for when I will get back to them with an update. "
                    "Fourth, once verified, I deliver the complete, accurate solution, confirm it resolves their question, "
                    "and consider documenting the resolution in the internal knowledge base for future inquiries."
                ),
                reference_concepts=[
                    "Honesty without guessing or misleading the customer",
                    "Reassuring communication and setting clear callback timelines",
                    "Consulting internal documentation, knowledge base, and team",
                    "Timely follow-through and updating documentation"
                ],
                rubric=[
                    RubricCriterion(
                        id="cs_4_c1",
                        title="Honesty & Accuracy Over Guesswork",
                        description="Emphasizes never guessing and transparently acknowledging the need to investigate.",
                        keywords=["honest", "never guess", "accurate", "truthful", "transparent"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_4_c2",
                        title="Internal Research & Resources",
                        description="Consults knowledge base, documentation, or senior specialists.",
                        keywords=["knowledge base", "documentation", "team", "senior", "colleagues", "research"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_4_c3",
                        title="Timeline Commitment & Reassurance",
                        description="Reassures the customer and sets an explicit timeframe for a response.",
                        keywords=["timeline", "timeframe", "update", "follow up", "reassure", "eta"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_4_c4",
                        title="Knowledge Base Enrichment",
                        description="Mentions documenting the newly discovered answer for team benefit.",
                        keywords=["document", "knowledge base", "wiki", "faq", "share", "future"],
                        weight=1.0
                    )
                ]
            ),
            QuestionItem(
                id="cs_5",
                role="customer_support",
                question="Describe how you would resolve a customer complaint.",
                reference_answer=(
                    "Resolving a customer complaint requires accountability, structured root-cause analysis, and restoring customer confidence. "
                    "I start by welcoming the feedback, acknowledging the inconvenience caused, and validating their frustration without defensive excuses. "
                    "Next, I gather precise details to diagnose the root cause of the complaint. Then, I propose a clear solution or compensatory gesture "
                    "(such as an immediate fix, fee waiver, or replacement) aligned with company policy. Once the customer agrees, "
                    "I execute the solution promptly and follow up after a few days to ensure everything continues working smoothly. "
                    "Lastly, I conduct an internal post-mortem or log the feedback to prevent similar complaints from occurring again."
                ),
                reference_concepts=[
                    "Accepting accountability and validating feelings",
                    "Investigating root causes rather than treating symptoms",
                    "Agreeing on a fair and prompt remedy",
                    "Post-resolution follow-up and process improvement"
                ],
                rubric=[
                    RubricCriterion(
                        id="cs_5_c1",
                        title="Accountability & Active Apology",
                        description="Takes ownership of the problem, expresses sincere regret, and avoids defensiveness.",
                        keywords=["ownership", "accountability", "apologize", "sorry", "ownership", "listen"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_5_c2",
                        title="Root Cause Investigation",
                        description="Asks targeted questions to uncover the underlying cause rather than surface symptoms.",
                        keywords=["root cause", "investigate", "details", "understand", "diagnose"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_5_c3",
                        title="Remedy & Execution",
                        description="Delivers an agreeable resolution (fix, credit, replacement) promptly.",
                        keywords=["remedy", "solution", "action", "compensation", "fix", "execute"],
                        weight=1.0
                    ),
                    RubricCriterion(
                        id="cs_5_c4",
                        title="Post-Incident Follow-Up & Prevention",
                        description="Follows up with the customer and feeds learnings into internal processes to prevent recurrence.",
                        keywords=["follow up", "prevention", "feedback", "post-mortem", "process improvement", "log"],
                        weight=1.0
                    )
                ]
            )
        ]
    )
}

def get_role_questions(role_id: str) -> RoleQuestions:
    if role_id not in QUESTION_BANK:
        raise KeyError(f"Unknown role '{role_id}'")
    return QUESTION_BANK[role_id]

def get_question_by_id_or_text(role_id: str, question_text: str, question_id: str = None) -> QuestionItem:
    role_data = QUESTION_BANK.get(role_id)
    if not role_data:
        # Default fallback to software_engineer if role not found
        role_data = QUESTION_BANK["software_engineer"]
    
    if question_id:
        for q in role_data.questions:
            if q.id == question_id:
                return q
                
    # Fallback to normalized question text matching
    norm_input = question_text.strip().lower()
    for q in role_data.questions:
        if q.question.strip().lower() == norm_input:
            return q
            
    # Fuzzy substring match
    for q in role_data.questions:
        if norm_input in q.question.strip().lower() or q.question.strip().lower() in norm_input:
            return q

    # If still not found, return the first question of the role as closest representative
    return role_data.questions[0]
