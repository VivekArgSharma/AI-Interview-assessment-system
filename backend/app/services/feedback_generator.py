from typing import List, Tuple
from ..schemas.assessment import RubricCriterionResult, QuestionItem

class FeedbackGenerator:
    @staticmethod
    def generate_feedback(
        question_item: QuestionItem,
        rubric_results: List[RubricCriterionResult],
        relevance_score: float,
        content_score: float
    ) -> Tuple[List[str], List[str], List[str], List[str]]:
        """
        Generates deterministic, traceable assessment feedback grounded directly in the
        candidate's response and rubric evaluation findings.

        Returns:
            (strengths, weaknesses, evidence, actionable_feedback)
        """
        strengths: List[str] = []
        weaknesses: List[str] = []
        evidence: List[str] = []
        feedback: List[str] = []

        matched_criteria = [r for r in rubric_results if r.matched]
        unmatched_criteria = [r for r in rubric_results if not r.matched]

        # 1. Strengths
        for m in matched_criteria:
            strengths.append(f"Successfully addressed '{m.title}': {m.description}")
            if m.evidence:
                evidence.append(f"Criterion '{m.title}' supported by excerpt: {m.evidence}")

        if relevance_score >= 7.5:
            strengths.append(
                f"High semantic alignment with canonical interview response criteria (Cosine relevance: {relevance_score}/10)."
            )

        if not strengths:
            strengths.append("Submitted answer addresses the prompt topic, providing an initial baseline for technical assessment.")

        # 2. Weaknesses / Missing Criteria
        for u in unmatched_criteria:
            weaknesses.append(f"Omitted or insufficiently explained '{u.title}': {u.description}")

        if relevance_score < 5.0:
            weaknesses.append(
                f"Low semantic proximity to benchmark reference answer (Relevance: {relevance_score}/10). Key foundational terms were omitted."
            )

        if not weaknesses:
            weaknesses.append("No major missing rubric criteria identified across standard evaluation dimensions.")

        # 3. Actionable Feedback
        if unmatched_criteria:
            for u in unmatched_criteria:
                feedback.append(
                    f"To strengthen '{u.title}', explicitly incorporate key concepts: {u.description}."
                )

        if relevance_score < 7.0 and question_item.reference_concepts:
            top_concepts = ", ".join(question_item.reference_concepts[:3])
            feedback.append(
                f"Deepen technical rigor by grounding your answer in core principles like: {top_concepts}."
            )

        if content_score >= 8.5:
            feedback.append(
                "Excellent conceptual coverage. Next level refinement: provide concise real-world edge cases or trade-offs."
            )
        elif content_score <= 4.0:
            feedback.append(
                "Answer is currently too concise or high-level. Structure your response by clearly defining the mechanism, practical examples, and trade-offs."
            )

        return strengths, weaknesses, evidence, feedback
