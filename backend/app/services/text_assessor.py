import logging
from typing import Dict, Any, Optional
import numpy as np

from ..schemas.assessment import AssessRequest, AssessResponse, QuestionItem
from .text_encoder import TextEncoder
from .rubric_evaluator import RubricEvaluator
from .feedback_generator import FeedbackGenerator
from ..data.question_bank import get_question_by_id_or_text

logger = logging.getLogger(__name__)

class TextAssessor:
    _instance: Optional["TextAssessor"] = None

    def __init__(self, encoder: Optional[TextEncoder] = None):
        self.encoder = encoder or TextEncoder.get_instance()
        self.rubric_evaluator = RubricEvaluator(self.encoder)
        self.feedback_generator = FeedbackGenerator()
        self.session_assessment_count = 0

    @classmethod
    def get_instance(cls) -> "TextAssessor":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def normalize_cosine_similarity(cos_sim: float) -> float:
        """
        Maps raw Sentence-BERT cosine similarity to a normalized 0-10 scale.
        For all-MiniLM-L6-v2, baseline semantic similarity between domain-relevant
        paragraphs generally falls within [0.20, 0.85].
        Linear mapping: clamp((cos_sim - 0.20) / (0.85 - 0.20) * 10, 0.0, 10.0)
        """
        clamped = max(0.20, min(0.85, cos_sim))
        scaled = (clamped - 0.20) / (0.85 - 0.20) * 10.0
        return round(float(scaled), 1)

    def assess(self, request: AssessRequest) -> AssessResponse:
        self.session_assessment_count += 1

        # 1. Retrieve question details, reference answer, and rubrics
        question_item: QuestionItem = get_question_by_id_or_text(
            role_id=request.role,
            question_text=request.question,
            question_id=request.question_id
        )

        candidate_text = request.answer.strip()
        ref_text = question_item.reference_answer.strip()

        # 2. Extract Sentence-BERT Embeddings
        cand_emb = self.encoder.encode(candidate_text)
        ref_emb = self.encoder.encode(ref_text)

        # 3. Calculate Cosine Similarity to Canonical Reference Answer
        raw_cosine = self.encoder.cosine_similarity(cand_emb, ref_emb)
        relevance_score = self.normalize_cosine_similarity(raw_cosine)

        # 4. Evaluate Rubric Criteria
        rubric_results = self.rubric_evaluator.evaluate_all(
            candidate_text=candidate_text,
            rubric=question_item.rubric
        )

        # 5. Compute Content Quality Score based on rubric criteria weights
        total_weight = sum(c.weight for c in question_item.rubric) or 1.0
        matched_weight = sum(
            c.weight for c, r in zip(question_item.rubric, rubric_results) if r.matched
        )
        content_score = round(float((matched_weight / total_weight) * 10.0), 1)

        # 6. Overall Aggregation Rule (Transparent, documented weighted combination)
        # Content Quality (55%) + Semantic Relevance (45%)
        overall_score = round(0.55 * content_score + 0.45 * relevance_score, 1)

        # 7. Generate Traceable Feedback
        strengths, weaknesses, evidence, feedback = self.feedback_generator.generate_feedback(
            question_item=question_item,
            rubric_results=rubric_results,
            relevance_score=relevance_score,
            content_score=content_score
        )

        # 8. Construct Assessment Response adhering to strict integrity guidelines:
        # Communication score is explicitly set to None (Not yet measured)
        scoring_notes = {
            "relevance_score_method": (
                f"Sentence-BERT (all-MiniLM-L6-v2) cosine similarity against canonical reference benchmark. "
                f"Raw cosine similarity: {round(raw_cosine, 4)}. Linear normalization applied over [0.20, 0.85] range."
            ),
            "content_score_method": (
                f"Rubric-based coverage: {len([r for r in rubric_results if r.matched])} of "
                f"{len(rubric_results)} criteria validated via sentence semantic matching and keyword extraction."
            ),
            "communication_score_method": (
                "Not yet measured. Text-only Sentence-BERT cannot independently measure speaking cadence, vocal confidence, "
                "or verbal fluency without acoustic speech features (Whisper/wav2vec 2.0)."
            ),
            "overall_score_method": (
                "Transparent weighted aggregation: 55% Rubric Content Quality + 45% Reference Answer Semantic Relevance."
            )
        }

        if request.mode == "audio" and request.audio_analysis:
            scoring_notes["speech_modality_note"] = (
                "Spoken response evaluated: text assessment conducted on Whisper transcript; "
                "acoustic metrics (pauses, WPM, fillers) provided descriptively without arbitrary weighting."
            )

        return AssessResponse(
            content_score=content_score,
            relevance_score=relevance_score,
            communication_score=None,  # Intentionally null per Section 4/9 until trained delivery model
            overall_score=overall_score,
            strengths=strengths,
            weaknesses=weaknesses,
            evidence=evidence,
            feedback=feedback,
            rubric_breakdown=rubric_results,
            assessment_method="sentence_bert_rubric_baseline",
            model_name=self.encoder.model_name if self.encoder.is_loaded else "fallback_vectorizer",
            scoring_notes=scoring_notes,
            mode=request.mode,
            audio_analysis=request.audio_analysis
        )
