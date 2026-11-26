import pytest
import numpy as np
from app.services.fusion_model import MultimodalFusionModel
from app.services.llm_question_generator import LLMQuestionGenerator

def test_shannon_differential_entropy_calculation():
    """Verify that Shannon differential entropy is calculated accurately for Gaussian posteriors."""
    fusion = MultimodalFusionModel()
    
    # High standard error (uncertainty) should yield high positive entropy
    high_err_entropy = fusion.compute_differential_entropy(std_error=0.45)
    # Low standard error (tight consensus) should yield negative entropy (high certainty)
    low_err_entropy = fusion.compute_differential_entropy(std_error=0.08)
    
    assert high_err_entropy > low_err_entropy, "Higher standard error must yield higher differential entropy"
    assert low_err_entropy < 0.0, "Tight standard error (0.08) should have negative differential entropy in nats"

def test_information_gain_metrics_detection():
    """Verify that AIGP correctly identifies high-entropy dimensions and triggers active probes."""
    fusion = MultimodalFusionModel()
    
    mock_fused_result = {
        "overall_score": 3.2,
        "overall_ci_low": 2.4,
        "overall_ci_high": 4.0,
        "dimensions": {
            "Distributed Transactions": {
                "fused_score": 2.8,
                "ci_low": 1.8,
                "ci_high": 3.8,
                "ci_width": 2.0,
                "std_error": 0.42,
                "differential_entropy": 0.45
            },
            "Algorithmic Complexity": {
                "fused_score": 4.5,
                "ci_low": 4.2,
                "ci_high": 4.8,
                "ci_width": 0.6,
                "std_error": 0.09,
                "differential_entropy": -0.40
            }
        }
    }
    
    metrics = fusion.calculate_information_gain_metrics(mock_fused_result)
    
    assert metrics["requires_active_probe"] is True, "Wide CI and high entropy must trigger active probe"
    assert metrics["most_uncertain_dimension"] == "Distributed Transactions"
    assert metrics["eligible_for_early_stopping"] is False

def test_early_stopping_sufficiency_certificate():
    """Verify that decisive convergence triggers the Information Sufficiency Certificate."""
    fusion = MultimodalFusionModel()
    
    # Highly decisive, consistent assessment
    mock_converged_result = {
        "overall_score": 4.6,
        "overall_ci_low": 4.3,
        "overall_ci_high": 4.9,
        "dimensions": {
            "System Architecture": {
                "fused_score": 4.6,
                "ci_low": 4.4,
                "ci_high": 4.8,
                "ci_width": 0.4,
                "std_error": 0.07,
                "differential_entropy": -0.45
            },
            "Communication": {
                "fused_score": 4.7,
                "ci_low": 4.5,
                "ci_high": 4.9,
                "ci_width": 0.4,
                "std_error": 0.06,
                "differential_entropy": -0.55
            }
        }
    }
    
    metrics = fusion.calculate_information_gain_metrics(mock_converged_result)
    
    assert metrics["eligible_for_early_stopping"] is True
    assert metrics["information_sufficiency_certificate"]["issued"] is True
    assert metrics["information_sufficiency_certificate"]["status"] == "VALID_INFORMATION_SUFFICIENCY"
    assert metrics["information_sufficiency_certificate"]["epistemic_confidence_pct"] >= 90.0

def test_rank_candidate_probes_by_expected_information_gain():
    """Verify that surgical architectural probes are ranked higher by Expected Information Gain than generic prompts."""
    fusion = MultimodalFusionModel()
    
    candidate_probes = [
        "Can you tell me more about that?",  # Generic prompt (low information gain)
        "How did you feel about that project?",  # Affective filler
        "If two concurrent requests hit the key at the exact same millisecond, what lock or mutex mechanism prevents a race condition?"  # High information probe
    ]
    
    ranked = fusion.rank_candidate_probes_by_eig(
        candidate_probes=candidate_probes,
        target_dimension="Concurrency & Race Conditions",
        prior_std_error=0.35
    )
    
    assert len(ranked) == 3
    # The technical probe with lock/mutex keywords must have the highest expected info gain
    top_probe = ranked[0]
    assert "lock" in top_probe["probe_text"].lower() or "race condition" in top_probe["probe_text"].lower()
    assert top_probe["expected_info_gain_nats"] > ranked[-1]["expected_info_gain_nats"]

def test_llm_active_probe_synthesis():
    """Verify that the generator synthesizes valid AIGP payloads with expected nats."""
    res = LLMQuestionGenerator.generate_active_information_gain_probe(
        parent_question="How do you handle cache invalidation?",
        candidate_answer="I use Redis for caching.",
        target_dimension="Distributed Systems & Concurrency",
        expected_concepts=["singleflight lock", "TTL jitter"]
    )
    
    assert "selected_probe_text" in res
    assert res["expected_info_gain_nats"] > 0.0
    assert res["projected_variance_reduction_pct"] >= 30.0
    assert len(res["all_ranked_candidates"]) == 3
