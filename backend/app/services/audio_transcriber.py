import io
import os
import wave
import struct
import logging
from typing import Dict, Any, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger(__name__)

class AudioTranscriber:
    _instance: Optional["AudioTranscriber"] = None

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or os.getenv("WHISPER_MODEL", "small.en")
        self.model = None
        self.is_loaded = False
        self.load_error: Optional[str] = None
        self._load_model()

    @classmethod
    def get_instance(cls, model_name: Optional[str] = None) -> "AudioTranscriber":
        if cls._instance is None:
            cls._instance = cls(model_name=model_name)
        return cls._instance

    def _load_model(self):
        try:
            import whisper
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"

            candidates = [self.model_name]
            for fallback in ["small.en", "base.en", "tiny"]:
                if fallback not in candidates:
                    candidates.append(fallback)

            loaded = False
            last_err = None
            for cand in candidates:
                try:
                    logger.info(f"Attempting to load Whisper model '{cand}' on {device}...")
                    self.model = whisper.load_model(cand, device=device)
                    self.model_name = cand
                    loaded = True
                    logger.info(f"Whisper '{cand}' successfully loaded on {device}")
                    break
                except Exception as cand_err:
                    last_err = cand_err
                    logger.warning(f"Could not load Whisper candidate '{cand}': {cand_err}. Trying fallback...")

            if not loaded:
                raise RuntimeError(f"All Whisper model candidates failed to load. Last error: {last_err}")

            self.is_loaded = True
            self.load_error = None
        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            logger.warning(
                f"Whisper model '{self.model_name}' could not be loaded: {e}. "
                "Ensure 'openai-whisper' is installed and torch is available."
            )

    @staticmethod
    def read_audio_data(audio_bytes_or_path: Union[bytes, str]) -> Tuple[np.ndarray, int]:
        """
        Reads audio bytes or file path into a 1D NumPy float32 array normalized to [-1.0, 1.0].
        Supports:
        1. soundfile (WAV, FLAC, OGG)
        2. Standard library wave module (PCM WAV)
        3. scipy.io.wavfile (PCM WAV)
        """
        # Case 1: Try soundfile if available
        try:
            import soundfile as sf
            if isinstance(audio_bytes_or_path, bytes):
                data, sr = sf.read(io.BytesIO(audio_bytes_or_path), dtype="float32")
            else:
                data, sr = sf.read(audio_bytes_or_path, dtype="float32")
            
            # If multi-channel, convert to mono
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            return data.astype(np.float32), sr
        except Exception as sf_err:
            logger.debug(f"soundfile read failed or unavailable: {sf_err}. Trying wave/scipy...")

        # Case 2: Try standard library wave module (pure python, no external deps)
        try:
            if isinstance(audio_bytes_or_path, bytes):
                wav_file = wave.open(io.BytesIO(audio_bytes_or_path), "rb")
            else:
                wav_file = wave.open(audio_bytes_or_path, "rb")

            n_channels = wav_file.getnchannels()
            sampwidth = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            raw_frames = wav_file.readframes(n_frames)
            wav_file.close()

            if sampwidth == 2:  # 16-bit PCM
                count = n_frames * n_channels
                shorts = struct.unpack(f"<{count}h", raw_frames)
                audio_np = np.array(shorts, dtype=np.float32) / 32768.0
            elif sampwidth == 1:  # 8-bit PCM
                count = n_frames * n_channels
                bytes_data = struct.unpack(f"<{count}B", raw_frames)
                audio_np = (np.array(bytes_data, dtype=np.float32) - 128.0) / 128.0
            elif sampwidth == 4:  # 32-bit float or int
                count = n_frames * n_channels
                ints = struct.unpack(f"<{count}i", raw_frames)
                audio_np = np.array(ints, dtype=np.float32) / 2147483648.0
            else:
                raise ValueError(f"Unsupported sample width: {sampwidth}")

            if n_channels > 1:
                audio_np = audio_np.reshape(-1, n_channels).mean(axis=1)

            return audio_np.astype(np.float32), framerate
        except Exception as wave_err:
            logger.debug(f"wave read failed: {wave_err}. Trying scipy.io.wavfile...")

        # Case 3: Try scipy.io.wavfile
        try:
            from scipy.io import wavfile
            if isinstance(audio_bytes_or_path, bytes):
                sr, data = wavfile.read(io.BytesIO(audio_bytes_or_path))
            else:
                sr, data = wavfile.read(audio_bytes_or_path)

            if data.dtype == np.int16:
                data = data.astype(np.float32) / 32768.0
            elif data.dtype == np.int32:
                data = data.astype(np.float32) / 2147483648.0
            elif data.dtype == np.uint8:
                data = (data.astype(np.float32) - 128.0) / 128.0

            if data.ndim > 1:
                data = np.mean(data, axis=1)

            return data.astype(np.float32), sr
        except Exception as scipy_err:
            # If system ffmpeg is available, attempt conversion to WAV
            try:
                import subprocess, tempfile
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
                    tmp_out_path = tmp_out.name

                cmd = ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", tmp_out_path]
                p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                input_bytes = audio_bytes_or_path if isinstance(audio_bytes_or_path, bytes) else open(audio_bytes_or_path, "rb").read()
                p.communicate(input=input_bytes)

                if p.returncode == 0 and os.path.exists(tmp_out_path) and os.path.getsize(tmp_out_path) > 44:
                    import soundfile as sf
                    data, sr = sf.read(tmp_out_path, dtype="float32")
                    try:
                        os.remove(tmp_out_path)
                    except Exception:
                        pass
                    return data.astype(np.float32), sr
            except Exception:
                pass

            raise ValueError(
                f"Could not parse audio format. The browser microphone encoder converts speech to 16kHz WAV automatically. "
                f"If uploading an audio file, please provide a standard .wav file. ({scipy_err})"
            )

    @staticmethod
    def resample_to_16k(audio: np.ndarray, orig_sr: int) -> np.ndarray:
        """
        Resamples 1D audio array to 16,000 Hz, which is the native sample rate required by Whisper.
        """
        target_sr = 16000
        if orig_sr == target_sr:
            return audio
        
        # Resample using scipy.signal
        from scipy import signal
        num_target_samples = int(round(len(audio) * float(target_sr) / float(orig_sr)))
        resampled = signal.resample(audio, num_target_samples)
        return resampled.astype(np.float32)

    def transcribe(
        self,
        audio_bytes_or_path: Union[bytes, str],
        filename: str = "audio.wav"
    ) -> Dict[str, Any]:
        """
        Transcribes audio using the pretrained Whisper model.
        Returns:
            {
                "transcript": str,
                "language": str,
                "duration_seconds": float,
                "model_name": str,
                "status": str,
                "word_count": int,
                "segments": list,
                "audio_16k": np.ndarray (for downstream VAD analysis)
            }
        """
        # 1. Read audio data
        audio_raw, sample_rate = self.read_audio_data(audio_bytes_or_path)
        total_duration = float(len(audio_raw)) / float(max(1, sample_rate))

        if total_duration < 0.1:
            raise ValueError("Audio recording is too short (< 0.10s) or empty.")

        # 2. Resample to 16kHz for Whisper and VAD
        audio_16k = self.resample_to_16k(audio_raw, sample_rate)

        # 3. Check model loading status
        if not self.is_loaded or self.model is None:
            # Re-attempt lazy load in case it was installed after app start
            self._load_model()

        if not self.is_loaded or self.model is None:
            raise RuntimeError(
                f"Whisper transcription model is unavailable. Error: {self.load_error or 'Model not loaded'}. "
                "Setup instruction: Run 'pip install openai-whisper' and restart backend."
            )

        # 4. Transcribe directly from NumPy array (no ffmpeg dependency!)
        try:
            # Normalize peak amplitude if the recorded audio is quiet
            max_amp = float(np.max(np.abs(audio_16k))) if len(audio_16k) > 0 else 0.0
            if 0.001 < max_amp < 0.60:
                audio_for_whisper = (audio_16k / max_amp) * 0.85
            else:
                audio_for_whisper = audio_16k

            # Enforce English and anti-hallucination inference parameters
            result = self.model.transcribe(
                audio_for_whisper,
                language="en",
                temperature=0.0,
                condition_on_previous_text=False,  # Stops looping hallucinations
                no_speech_threshold=0.5,           # Ignores low-level hum/silence
                compression_ratio_threshold=2.4,  # Rejects repetitive gibberish
                logprob_threshold=-1.0,
                fp16=False,
                verbose=False
            )
            transcript = result.get("text", "").strip()
            language = result.get("language", "en")
            segments = result.get("segments", [])

            words = transcript.split()
            word_count = len(words)

            return {
                "transcript": transcript,
                "language": language,
                "duration_seconds": round(total_duration, 2),
                "model_name": f"whisper-{self.model_name}",
                "status": "success",
                "word_count": word_count,
                "segments": segments,
                "audio_16k": audio_16k,
                "sample_rate": 16000
            }
        except Exception as e:
            logger.error(f"Whisper transcription execution failed: {e}", exc_info=True)
            raise RuntimeError(f"Whisper failed during inference: {str(e)}")
