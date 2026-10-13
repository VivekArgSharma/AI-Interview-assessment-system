import pytest
from app.services.text_encoder import TextEncoder
from app.services.text_assessor import TextAssessor
from app.schemas.assessment import AssessRequest

def test_text_encoder_preprocessing():
    raw = "  Hello   world \x00 with  spacing! \n\n "
    clean = TextEncoder.preprocess_text(raw)
    assert clean == "Hello world with spacing!"

def test_encoder_embedding_shape_and_similarity():
    encoder = TextEncoder.get_instance()
    emb1 = encoder.encode("Hash maps store key-value pairs.")
    emb2 = encoder.encode("Hash tables map keys to values using hashing.")
    emb3 = encoder.encode("The weather today is cloudy with rain showers.")

    sim_related = encoder.cosine_similarity(emb1, emb2)
    sim_unrelated = encoder.cosine_similarity(emb1, emb3)

    assert sim_related > sim_unrelated
    assert sim_related > 0.5

def test_text_assessor_rubric_scoring():
    assessor = TextAssessor.get_instance()
    req = AssessRequest(
        question="Describe the difference between processes and threads.",
        answer=(
            "Processes run in separate, isolated memory address spaces and communicate via inter-process communication (IPC). "
            "In contrast, threads share the same address space, heap, and code segment of their parent process. "
            "Context switching between processes incurs high overhead, while thread switching is lightweight. "
            "Threads require synchronization primitives like mutexes and locks to prevent race conditions."
        ),
        role="software_engineer"
    )
    res = assessor.assess(req)

    assert res.content_score is not None
    assert res.content_score >= 8.0
    assert res.relevance_score is not None
    assert res.relevance_score >= 7.0
    assert res.communication_score is None

    # Check that at least 3 criteria matched
    matched_count = sum(1 for c in res.rubric_breakdown if c.matched)
    assert matched_count >= 3
