import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.services.audio_storage import AudioStorageService

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def test_audio_storage_save_and_retrieve():
    test_bytes = b"RIFF....WAVEfmt test audio data"
    answer_id = "test_ans_123"

    storage_key = AudioStorageService.save_audio(answer_id, test_bytes)
    assert storage_key == f"{answer_id}.wav"

    filepath = AudioStorageService.get_audio_filepath(storage_key)
    assert filepath is not None

    with open(filepath, "rb") as f:
        read_bytes = f.read()
    assert read_bytes == test_bytes

    # Delete
    deleted = AudioStorageService.delete_audio(storage_key)
    assert deleted is True

    # Confirm it's gone
    assert AudioStorageService.get_audio_filepath(storage_key) is None

def test_delete_user_recordings_endpoint():
    res = client.delete("/api/v1/users/me/recordings")
    assert res.status_code == 200
    data = res.json()
    assert "deleted_count" in data
