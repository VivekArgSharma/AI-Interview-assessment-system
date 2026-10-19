import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class InterviewerAgent:
    """
    LangGraph-style Interviewer Agent State Machine for PRISM (PRD Section 8).
    
    Nodes:
    - PlanInterview: Prepares structured question queue from role, rubric, and candidate level.
    - AskQuestion: Formulates the next prompt with persona tone.
    - Listen: Captures candidate streaming speech or scenario actions.
    - LiveScoreUpdate: Runs rapid feature assessment and checks uncertainty bands.
    - DecideNext: Executes policy:
        1. Wrap-up if time expired.
        2. Probe targeted dimension if uncertainty is high (D4).
        3. Depth probe if answer is shallow.
        4. Integrity probe if constraint-change check due (D11).
        5. Next planned question.
    """

    PROBE_TEMPLATES = {
        "uncertainty": {
            "discovery": "Could you drill deeper into how you would uncover hidden organizational constraints that the client hasn't explicitly mentioned?",
            "problem_decomposition": "What specific component boundaries or sub-problems would you isolate first to verify where the failure occurs?",
            "objection_handling": "How would you handle this if the stakeholder completely rejected that initial premise?",
            "trade_off_awareness": "What are the engineering trade-offs between that approach versus a synchronous transactional rollback?",
            "listening": "The stakeholder mentioned a specific timeline worry—how does your response directly address their scheduling constraint?"
        },
        "depth": [
            "What edge cases or failure modes might break this approach under high concurrency?",
            "Why did you choose this architecture over an event-driven worker pattern?",
            "Could you walk me through the concrete trade-offs in terms of latency versus data consistency?"
        ],
        "integrity_constraint_change": [
            "Now suppose the network latency jumps from 20ms to 2000ms and memory is capped at 512MB—how does your solution adapt?",
            "If the client states they cannot use external cloud dependencies and must stay on-prem, how do you adjust your recommendation?",
            "Walk me through the exact line of reasoning you used in your resume project when facing this similar architectural bottleneck."
        ]
    }

    def __init__(self, probe_budget: int = 2):
        self.probe_budget = probe_budget

    def decide_next_action(
        self,
        current_stage_index: int,
        total_stages: int,
        dimension_uncertainties: Dict[str, bool],
        candidate_answer: str,
        probes_used: int = 0,
        integrity_checks_completed: int = 0,
        time_remaining_minutes: float = 10.0
    ) -> Dict[str, Any]:
        """
        Executes the DecideNext policy (PRD Section 8).
        """
        # 1. Time nearly out
        if time_remaining_minutes <= 1.0 or current_stage_index >= total_stages:
            return {
                "action": "wrap_up",
                "reason": "session_time_elapsed_or_stages_completed",
                "prompt": "Thank you for sharing your thoughts today! We have completed all stages of the interview. Our multimodal scoring engine is now compiling your scorecard and actionable improvement plan.",
                "targeted_dimension": None
            }

        # 2. Uncertainty-driven follow-up probe (D4)
        uncertain_dims = [dim for dim, is_unc in dimension_uncertainties.items() if is_unc]
        if uncertain_dims and probes_used < self.probe_budget:
            target_dim = uncertain_dims[0]
            # Select probe template
            probe_text = self.PROBE_TEMPLATES["uncertainty"].get(
                target_dim.lower(),
                f"Could you elaborate further on your reasoning regarding {target_dim}? What key factors led to that choice?"
            )
            return {
                "action": "probe_uncertainty",
                "reason": f"high_uncertainty_in_{target_dim}",
                "prompt": probe_text,
                "targeted_dimension": target_dim
            }

        # 3. Shallow answer check (answer < 25 words or low depth)
        words = candidate_answer.split()
        if len(words) < 22 and probes_used < self.probe_budget:
            return {
                "action": "probe_depth",
                "reason": "answer_depth_insufficient",
                "prompt": self.PROBE_TEMPLATES["depth"][0],
                "targeted_dimension": "depth"
            }

        # 4. Anti-cheating / Constraint-change integrity probe (D11, FR21)
        if integrity_checks_completed == 0 and current_stage_index >= 1:
            return {
                "action": "probe_integrity",
                "reason": "constraint_change_verification",
                "prompt": self.PROBE_TEMPLATES["integrity_constraint_change"][0],
                "targeted_dimension": "integrity_consistency"
            }

        # 5. Advance to next planned stage/question
        return {
            "action": "next_question",
            "reason": "advance_planned_curriculum",
            "prompt": None,
            "targeted_dimension": None
        }
