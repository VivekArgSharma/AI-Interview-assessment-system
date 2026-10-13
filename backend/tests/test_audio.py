import io
import wave
import struct
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.audio_feature_extractor import AudioFeatureExtractor
from app.services.audio_transcriber import AudioTranscriber

client = TestClient(app)

def create_synthetic_wav(
    duration: float = 2.0,
    sample_rate: int = 16000,
    has_speech: bool = True
) -> bytes:
    """
    Creates an in-memory 16-bit mono PCM WAV file for testing.
    """
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)

        total_samples = int(duration * sample_rate)
        t = np.linspace(0, duration, total_samples, endpoint=False)

        if has_speech:
            # 440 Hz tone with a 0.5s pause in the middle
            signal = np.sin(2 * np.pi * 440 * t) * 0.5
            # Create a pause between 0.8s and 1.3s (0.5s pause)
            pause_start = int(0.8 * sample_rate)
            pause_end = int(1.3 * sample_rate)
            signal[pause_start:pause_end] = 0.0
        else:
            signal = np.zeros(total_samples, dtype=np.float32)

        pcm_data = (signal * 32767).astype(np.int16)
        wav.writeframes(pcm_data.tobytes())

    return buffer.getvalue()

def test_filler_word_detection():
    extractor = AudioFeatureExtractor()

    text_with_fillers = "Um, so basically, like, a hash map uses a hash function, uh, to map keys."
    analysis = extractor.detect_filler_words(text_with_fillers)

    assert analysis.total_filler_count >= 2
    assert "um" in analysis.filler_counts or "uh" in analysis.filler_counts
    assert len(analysis.detected_instances) >= 2

def test_filler_word_legitimate_like_not_counted():
    extractor = AudioFeatureExtractor()

    # "I like Python" should NOT count "like" as a filler
    text_legitimate = "I like Python because it is fast."
    analysis = extractor.detect_filler_words(text_legitimate)
    assert analysis.filler_counts.get("like (filler)", 0) == 0

def test_speech_segment_detection_and_pauses():
    extractor = AudioFeatureExtractor()
    sr = 16000
    # 0.8s speech + 0.5s silence + 0.7s speech = 2.0s total
    audio_wav_bytes = create_synthetic_wav(duration=2.0, sample_rate=sr, has_speech=True)
    audio_raw, _ = AudioTranscriber.read_audio_data(audio_wav_bytes)

    analysis = extractor.analyze(audio_raw, sample_rate=sr, transcript="Test transcript here")

    assert analysis.total_duration_seconds >= 1.9
    assert analysis.speech_duration_seconds > 0.5
    assert analysis.silence_duration_seconds > 0.3
    # Check that at least one qualifying pause was detected
    assert analysis.pause_count >= 1
    assert analysis.longest_pause_duration >= 0.4

def test_speaking_rate_calculation():
    extractor = AudioFeatureExtractor()
    audio = np.zeros(16000 * 3, dtype=np.float32)  # 3 seconds
    transcript = "one two three four five six"  # 6 words in 3 seconds -> 120 WPM

    analysis = extractor.analyze(audio, sample_rate=16000, transcript=transcript)

    assert analysis.total_words == 6
    assert abs(analysis.words_per_minute - 120.0) < 5.0

def test_api_audio_transcribe_endpoint():
    wav_bytes = create_synthetic_wav(duration=1.0, sample_rate=16000, has_speech=False)
    response = client.post(
        "/api/v1/audio/transcribe",
        files={"file": ("test.wav", wav_bytes, "audio/wav")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data
    assert "duration_seconds" in data
    assert data["status"] == "success"
    assert "audio_analysis" in data

def test_api_audio_analyze_endpoint():
    wav_bytes = create_synthetic_wav(duration=1.5, sample_rate=16000, has_speech=True)
    response = client.post(
        "/api/v1/audio/analyze",
        files={"file": ("test.wav", wav_bytes, "audio/wav")},
        data={"transcript": "Um hello world"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "speech_duration_seconds" in data
    assert "pause_count" in data
    assert "words_per_minute" in data
    assert "filler_words" in data

def test_api_empty_audio_rejection():
    response = client.post(
        "/api/v1/audio/transcribe",
        files={"file": ("empty.wav", b"", "audio/wav")}
    )
    assert response.status_code == 400
