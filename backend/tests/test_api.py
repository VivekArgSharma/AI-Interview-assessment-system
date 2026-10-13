import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Multimodal AI-Based" in data["project"]

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_name" in data
    assert data["model_loaded"] is True
    assert data["assessment_method"] == "sentence_bert_rubric_baseline"

def test_questions_endpoint():
    response = client.get("/api/v1/questions")
    assert response.status_code == 200
    data = response.json()
    assert "software_engineer" in data
    assert "customer_support" in data
    se_questions = data["software_engineer"]["questions"]
    assert len(se_questions) >= 5
    cs_questions = data["customer_support"]["questions"]
    assert len(cs_questions) >= 5

def test_assess_valid_response():
    payload = {
        "question": "Explain how a hash map works.",
        "answer": (
            "A hash map uses a hash function to map keys to bucket indices in an array. "
            "Collisions can be resolved using separate chaining with linked lists or open addressing. "
            "On average, lookups, insertions, and deletions take O(1) constant time."
        ),
        "role": "software_engineer"
    }
    response = client.post("/api/v1/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["relevance_score"] is not None
    assert data["relevance_score"] >= 6.0
    assert data["content_score"] is not None
    assert data["content_score"] >= 6.0
    assert data["overall_score"] is not None
    # Communication score must be None as it's not yet measured
    assert data["communication_score"] is None
    assert len(data["rubric_breakdown"]) > 0
    assert len(data["strengths"]) > 0
    assert len(data["feedback"]) > 0
    assert "scoring_notes" in data

def test_assess_validation_empty_answer():
    payload = {
        "question": "Explain how a hash map works.",
        "answer": "   ",
        "role": "software_engineer"
    }
    response = client.post("/api/v1/assess", json=payload)
    assert response.status_code == 422

def test_assess_invalid_role():
    payload = {
        "question": "Explain how a hash map works.",
        "answer": "A hash map uses a hash function.",
        "role": "unknown_role_xyz"
    }
    response = client.post("/api/v1/assess", json=payload)
    assert response.status_code == 400

def test_metrics_endpoint():
    response = client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["is_synthetic"] is True
    assert "metrics" in data
    assert "overall_score" in data["metrics"]
    assert "mae" in data["metrics"]["overall_score"]
    assert "rmse" in data["metrics"]["overall_score"]
