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

def test_mock_interview_studio_endpoints():
    # 1. Fetch mock questions
    questions_res = client.get("/api/v1/mock-interview/questions")
    assert questions_res.status_code == 200
    questions = questions_res.json()
    assert len(questions) >= 4
    q0 = questions[0]
    assert "id" in q0 and "expected_concepts" in q0 and "model_exemplar" in q0

    # 2. Evaluate answer
    assess_res = client.post("/api/v1/mock-interview/assess", json={
        "question_id": q0["id"],
        "transcript": "To prevent a cache stampede when a hot key expires under high traffic, like, we can use a distributed lock or singleflight request collapsing. Basically, we also apply TTL jitter and maybe probabilistic early expiration so requests don't hit the database all at once."
    })
    assert assess_res.status_code == 200
    assess_data = assess_res.json()
    assert assess_data["overall_fused_score"] > 0
    assert "concept_analysis" in assess_data
    assert "pinpointed_deficits" in assess_data
    assert "actionable_drills" in assess_data
    assert "model_exemplar" in assess_data
    assert "comparison" in assess_data
    assert assess_data["comparison"]["candidate"]["speaking_rate_wpm"] > 0
    assert assess_data["comparison"]["exemplar"]["concept_coverage_percent"] == 100.0

def test_repo_grounded_studio_endpoints():
    # 1. Fetch available pre-indexed candidate repos
    projects_res = client.get("/api/v1/repo-grounding/projects")
    assert projects_res.status_code == 200
    projects = projects_res.json()
    assert len(projects) >= 2
    repo0 = projects[0]
    assert "repo_id" in repo0 and "files" in repo0 and "grounded_questions" in repo0
    assert len(repo0["files"][0]["classes"]) >= 1

    # 2. Test parse-resume endpoint
    resume_sample = """
    Vivek Sharma - Senior Systems Engineer
    Experience:
    - Architected low-latency distributed caching layer with stampede protection handling 40,000 requests/sec.
    - Implemented multi-region Raft consensus for active-active cache invalidation.
    """
    resume_res = client.post("/api/v1/repo-grounding/parse-resume", json={
        "resume_text": resume_sample,
        "repo_id": repo0["repo_id"]
    })
    assert resume_res.status_code == 200
    resume_data = resume_res.json()
    assert "claims" in resume_data
    assert len(resume_data["claims"]) >= 2

    # 3. Test assess repo grounded answer
    q0 = repo0["grounded_questions"][0]
    assess_res = client.post("/api/v1/repo-grounding/assess", json={
        "question_id": q0["question_id"],
        "candidate_answer": "I structured the cache with an in-memory asyncio.Lock and double-checked locking because acquiring an external Redis lock for every request introduces unnecessary network roundtrips. I added fifteen percent randomized TTL jitter to prevent cache stampedes.",
        "repo_id": repo0["repo_id"]
    })
    assert assess_res.status_code == 200
    assess_data = assess_res.json()
    assert "grounding_fidelity_score" in assess_data
    assert assess_data["grounding_fidelity_score"] > 60
    assert "anti_cheat_analysis" in assess_data
    assert "ai_evasion_risk" in assess_data["anti_cheat_analysis"]
    assert "exemplar_defense" in assess_data
    assert len(assess_data["exemplar_defense"]["speech_segments"]) >= 1

    # 4. Test parse custom repo code with Tree-Sitter
    custom_code = """
class RateLimiter:
    def __init__(self, capacity: int = 100):
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = 0.0

    def consume(self) -> bool:
        if self.tokens > 0:
            self.tokens -= 1
            return True
        return False
"""
    custom_res = client.post("/api/v1/repo-grounding/parse-repo", json={
        "repo_name": "vivek/custom-rate-limiter",
        "primary_language": "python",
        "code_content": custom_code,
        "file_path": "rate_limiter.py"
    })
    assert custom_res.status_code == 200
    custom_data = custom_res.json()
    assert custom_data["ast_analysis"]["symbols_count"] >= 1
    assert custom_data["vector_indexing"]["pgvector_schema_ready"] is True
    assert len(custom_data["generated_questions"]) >= 1

    # 5. Test upload-resume-pdf endpoint with in-memory PDF
    import io
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=100, height=100)
    pdf_buffer = io.BytesIO()
    writer.write(pdf_buffer)
    pdf_buffer.seek(0)

    upload_pdf_res = client.post(
        "/api/v1/repo-grounding/upload-resume-pdf",
        files={"file": ("candidate_resume.pdf", pdf_buffer.getvalue(), "application/pdf")},
        data={"code_content": "class HotCache:\n    def get(self, k): return None"}
    )
    assert upload_pdf_res.status_code == 200
    pdf_data = upload_pdf_res.json()
    assert pdf_data["status"] == "success"
    assert "grounded_questions" in pdf_data
    assert len(pdf_data["grounded_questions"]) >= 1
    assert "code_ast" in pdf_data



