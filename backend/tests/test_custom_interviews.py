import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_lookup_seeded_invite_code():
    """Verify looking up seeded custom interview TECH-101 returns valid metadata."""
    res = client.get("/api/v1/custom-interviews/by-code/TECH-101")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["invite_code"] == "TECH-101"
    assert data["track"] == "tech"
    assert "Architecture & Idempotency" in data["stages"]

def test_lookup_seeded_sales_invite_code():
    """Verify looking up seeded custom interview SALES-202 returns valid metadata."""
    res = client.get("/api/v1/custom-interviews/by-code/SALES-202")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["invite_code"] == "SALES-202"
    assert data["track"] == "sales"
    assert "Objection Handling & Pricing" in data["stages"]

def test_create_custom_interview():
    """Verify an interviewer can create a custom interview with questions and model answers."""
    payload = {
        "title": "Senior Distributed Cache Architect",
        "track": "tech",
        "duration_minutes": 20,
        "questions": [
            {
                "stage": "Cache Consistency",
                "question_text": "How do you handle cache invalidation race conditions under write-heavy workloads?",
                "correct_answer": "I use cache-aside with write-through locks, Redis pub/sub invalidation broadcasts, and short TTL fallback.",
                "key_concepts": ["cache-aside", "write-through", "Redis pub/sub", "TTL"]
            }
        ]
    }
    res = client.post("/api/v1/custom-interviews", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "invite_code" in data
    assert data["invite_code"].startswith("TECH-")
    assert data["questions_count"] == 1
    
    # Verify lookup by newly created code
    lookup_res = client.get(f"/api/v1/custom-interviews/by-code/{data['invite_code']}")
    assert lookup_res.status_code == 200
    assert lookup_res.json()["valid"] is True

def test_start_custom_interview_by_invite():
    """Verify candidate launching an interview with an invite code seeds questions with reference answers."""
    payload = {
        "invite_code": "TECH-101",
        "candidate_name": "Jordan Test",
        "candidate_email": "jordan@example.com"
    }
    res = client.post("/api/v1/custom-interviews/start", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert data["total_stages"] >= 3
    assert "current_question" in data
    assert data["current_question"]["question_text"] is not None
