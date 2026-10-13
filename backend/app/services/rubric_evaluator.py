import re
from typing import List, Tuple
import numpy as np
from ..schemas.assessment import RubricCriterion, RubricCriterionResult
from .text_encoder import TextEncoder

class RubricEvaluator:
    def __init__(self, encoder: TextEncoder):
        self.encoder = encoder

    @staticmethod
    def _split_into_sentences(text: str) -> List[str]:
        # Splits text into sentences while retaining meaningful clauses
        raw_sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
        sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 3]
        return sentences if sentences else [text.strip()]

    def evaluate_criterion(
        self,
        candidate_text: str,
        criterion: RubricCriterion
    ) -> RubricCriterionResult:
        """
        Evaluates whether a candidate answer satisfies a specific rubric criterion.
        Uses sentence-level semantic similarity combined with explicit keyword coverage.
        """
        sentences = self._split_into_sentences(candidate_text)
        criterion_query = f"{criterion.title}: {criterion.description}"

        # Encode criterion description and answer sentences
        crit_emb = np.asarray(self.encoder.encode(criterion_query), dtype=np.float32).flatten()
        raw_sentence_embs = self.encoder.encode(sentences)
        sentence_embs = np.atleast_2d(raw_sentence_embs)
        if sentence_embs.ndim > 2:
            sentence_embs = sentence_embs.reshape(-1, 384)

        best_similarity = -1.0
        best_sentence = ""

        for s_idx, s_text in enumerate(sentences):
            s_emb = sentence_embs[s_idx].flatten()
            sim = self.encoder.cosine_similarity(crit_emb, s_emb)
            if sim > best_similarity:
                best_similarity = sim
                best_sentence = s_text

        # Also check keyword/concept presence in full text
        lower_text = candidate_text.lower()
        matched_keywords = [kw for kw in criterion.keywords if kw.lower() in lower_text]
        keyword_ratio = len(matched_keywords) / max(1, len(criterion.keywords))

        # Combined confidence metric (0.6 semantic similarity + 0.4 keyword coverage)
        normalized_sim = max(0.0, (best_similarity - 0.20) / 0.60)
        confidence = float(np.clip(0.6 * normalized_sim + 0.4 * keyword_ratio, 0.0, 1.0))

        # Criterion is satisfied if candidate demonstrated semantic grounding or key terms
        matched = (confidence >= 0.42) or (len(matched_keywords) >= 1 and best_similarity >= 0.28) or (best_similarity >= 0.45)

        evidence = None
        if matched and best_sentence:
            evidence = f'"{best_sentence.strip()}"'
            if matched_keywords:
                evidence += f" (Matched concepts: {', '.join(matched_keywords[:3])})"
        elif matched_keywords:
            evidence = f"Matched explicit terminology: {', '.join(matched_keywords[:3])}"

        return RubricCriterionResult(
            criterion_id=criterion.id,
            title=criterion.title,
            description=criterion.description,
            matched=matched,
            confidence=round(confidence, 3),
            evidence=evidence
        )

    def evaluate_all(
        self,
        candidate_text: str,
        rubric: List[RubricCriterion]
    ) -> List[RubricCriterionResult]:
        return [self.evaluate_criterion(candidate_text, crit) for crit in rubric]
