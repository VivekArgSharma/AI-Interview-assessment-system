import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_list_interview_tracks():
    res = client.get("/api/v1/interview-tracks")
    assert res.status_code == 200
    tracks = res.json()
    track_ids = [t["id"] for t in tracks]
    assert "sales" in track_ids
    assert "bug_fixing" in track_ids

    sales_track = next(t for t in tracks if t["id"] == "sales")
    assert len(sales_track["stages"]) == 5
    assert len(sales_track["criteria"]) == 6

def test_auth_registration_and_login():
    email = "candidate_test@example.com"
    password = "TestPassword123!"

    # Register
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": "Test Candidate",
        "consent_recording": True
    })
    # If already registered from previous run, status is 400 or 200
    if reg_res.status_code == 200:
        token = reg_res.json()["access_token"]
        assert token is not None
    else:
        assert reg_res.status_code == 400

    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get Profile
    prof_res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert prof_res.status_code == 200
    assert prof_res.json()["email"] == email

def test_full_sales_interview_lifecycle():
    # 1. Create Session
    create_res = client.post("/api/v1/interviews", json={
        "track_id": "sales",
        "difficulty": "intermediate",
        "duration_minutes": 10,
        "voice_preference": "default"
    })
    assert create_res.status_code == 200
    session_data = create_res.json()
    session_id = session_data["id"]
    assert session_data["status"] == "created"
    assert session_data["total_stages"] == 5

    # 2. Start Session
    start_res = client.post(f"/api/v1/interviews/{session_id}/start")
    assert start_res.status_code == 200
    started_data = start_res.json()
    assert started_data["status"] == "in_progress"
    assert started_data["current_question"] is not None
    q1 = started_data["current_question"]
    assert q1["sequence_number"] == 1
    assert "expensive" in q1["question_text"]

    # 3. Submit Answer with immediate discount to test Adaptive Follow-up
    answer_res = client.post(f"/api/v1/interviews/{session_id}/answers", json={
        "question_id": q1["id"],
        "transcript": "I would immediately offer a 20% discount to keep them happy and sign the deal right now."
    })
    assert answer_res.status_code == 200
    ans_data = answer_res.json()
    assert ans_data["next_action"] == "follow_up"
    assert ans_data["follow_up_question"] is not None
    assert "discovery" in ans_data["follow_up_question"]["question_text"].lower()

    # 4. Answer the follow-up with good discovery questions
    q_follow = ans_data["follow_up_question"]
    ans_follow_res = client.post(f"/api/v1/interviews/{session_id}/answers", json={
        "question_id": q_follow["id"],
        "transcript": (
            "I would ask what budget constraints they are working under, what specific alternatives they are comparing, "
            "and which outcomes matter most to their business before discussing price."
        )
    })
    assert ans_follow_res.status_code == 200
    follow_result = ans_follow_res.json()
    # Should advance to Stage 2
    assert follow_result["next_action"] == "next_stage"
    assert follow_result["next_question"] is not None
    assert follow_result["next_question"]["sequence_number"] == 3

    # 5. End session early to verify partial/early report generation
    end_res = client.post(f"/api/v1/interviews/{session_id}/end")
    assert end_res.status_code == 200

    # 6. Retrieve Session Report
    report_res = client.get(f"/api/v1/interviews/{session_id}/report")
    assert report_res.status_code == 200
    report = report_res.json()
    assert "content_score" in report
    assert "delivery_summary" in report
    assert len(report["criteria_breakdown"]) == 6
    assert len(report["qa_history"]) == 2

def test_progress_endpoints():
    res = client.get("/api/v1/progress/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_sessions" in data
    assert "average_content_score" in data

    crit_res = client.get("/api/v1/progress/criteria")
    assert crit_res.status_code == 200

    rec_res = client.get("/api/v1/progress/recommendations")
    assert rec_res.status_code == 200
