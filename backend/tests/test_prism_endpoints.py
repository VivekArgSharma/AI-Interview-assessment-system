import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def test_prism_draft_rubric_tech_and_nontech():
    # Tech drafting
    res_tech = client.post("/api/v1/roles/draft-rubric", json={
        "job_title": "Senior Backend Infrastructure Engineer",
        "jd_text": "We are seeking a senior backend software engineer with deep expertise in distributed systems, bug fixing, and latency optimization.",
        "scenario_type": "S1"
    })
    assert res_tech.status_code == 200
    data_tech = res_tech.json()
    assert data_tech["scenario_type"] == "S1"
    assert len(data_tech["dimensions"]) >= 4
    assert any("Problem Decomposition" in d["criterion_name"] for d in data_tech["dimensions"])

    # Non-tech drafting
    res_nontech = client.post("/api/v1/roles/draft-rubric", json={
        "job_title": "Customer Escalation Specialist",
        "jd_text": "Lead client de-escalation, dispute resolution, and empathetic stakeholder communication.",
        "scenario_type": "N1"
    })
    assert res_nontech.status_code == 200
    data_nontech = res_nontech.json()
    assert data_nontech["scenario_type"] == "N1"
    assert any("Empathy" in d["criterion_name"] for d in data_nontech["dimensions"])

def test_prism_create_role_and_invite():
    role_res = client.post("/api/v1/roles", json={
        "title": "Staff Reliability Engineer (Incident Lead)",
        "jd_text": "Triages critical production outages and collaborates with simulated teammates.",
        "scenario_type": "S3",
        "duration_minutes": 25,
        "video_enabled": True,
        "delivery_weight": 0.25
    })
    assert role_res.status_code == 200
    role_data = role_res.json()
    role_id = role_data["id"]
    assert role_data["title"] == "Staff Reliability Engineer (Incident Lead)"

    # Create Invite
    invite_res = client.post(f"/api/v1/roles/{role_id}/invites", json={
        "candidate_email": "candidate_test_prism@example.com",
        "expiry_days": 7
    })
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    token = invite_data["token"]
    assert token.startswith("prism-")

    # Resolve Invite Token
    resolve_res = client.get(f"/api/v1/invites/{token}")
    assert resolve_res.status_code == 200
    assert resolve_res.json()["role_title"] == "Staff Reliability Engineer (Incident Lead)"

def test_prism_scenario_runner_and_persona_chat():
    # Test S1 Sandboxed Code Runner
    run_res = client.post("/api/v1/interviews/prism-demo-session-s1/scenario/run", json={
        "scenario_id": "S1",
        "code": "def process_batch(records, client):\n    processed = set()\n    for r in records:\n        processed.add(r['id'])\n    return {'status': 'success'}"
    })
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["tests_run"] == 3
    assert run_data["passed"] is True

    # Test N1 Persona Agent Step
    chat_res = client.post("/api/v1/interviews/prism-demo-session-s1/scenario/chat", json={
        "scenario_id": "N1",
        "candidate_message": "I sincerely apologize for the delay. I completely understand your frustration and will personally ensure your refund is prioritized today.",
        "current_patience": 60
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["persona_name"] == "Marcus Vance"
    assert chat_data["is_resolved"] is True
    assert chat_data["patience"] > 60

def test_prism_scorecard_and_review_queue():
    # Recruiter Scorecard
    scorecard_res = client.get("/api/v1/interviews/prism-demo-session-s1/scorecard")
    assert scorecard_res.status_code == 200
    sc_data = scorecard_res.json()
    assert sc_data["overall_score"] > 0
    assert len(sc_data["dimensions"]) >= 4
    # Check CI bounds and counterfactuals
    dim0 = sc_data["dimensions"][0]
    assert "ci_low" in dim0 and "ci_high" in dim0
    assert "counterfactual_deltas" in dim0
    assert "evidence_clips" in sc_data

    # Review Queue
    queue_res = client.get("/api/v1/reviews/queue")
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(item["session_id"] == "prism-demo-session-s1" for item in queue)

    # Resolve Review
    resolve_res = client.post("/api/v1/reviews/prism-demo-session-s1/resolve", json={
        "dimension": "Trade-Off Awareness",
        "adjusted_score": 4.0,
        "resolution_note": "Candidate explained in-memory vs distributed lock trade-offs in follow-up."
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["adjusted_score"] == 4.0

def test_prism_evaluation_agreement_metrics():
    res = client.get("/api/v1/eval/agreement")
    assert res.status_code == 200
    data = res.json()
    assert "human_vs_human_icc" in data
    assert "model_vs_human_icc" in data
    assert "ece" in data
    assert "ablation_study" in data
    assert len(data["ablation_study"]) == 5
    assert "fairness_slices" in data
    assert len(data["fairness_slices"]) >= 4
