import re
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

from ..schemas.assessment import (
    AudioAnalysisResponse,
    PauseInterval,
    SpeechInterval,
    FillerWordAnalysis,
    FillerWordInstance
)

logger = logging.getLogger(__name__)

class AudioFeatureExtractor:
    """
    Audio Feature Extraction Service for Interview Delivery Assessment.
    Extracts interpretable acoustic features:
    - Voice Activity Detection (VAD) & Pause Analysis
    - Speaking Rate (WPM & Articulation Rate)
    - Transcript-based Filler-Word Detection
    - Interface placeholder for wav2vec 2.0 dense representations
    """

    def __init__(self, min_pause_duration: float = 0.40):
        self.min_pause_duration = min_pause_duration  # Minimum duration (seconds) to qualify as meaningful pause
        self.silero_model = None
        self.silero_available = False
        self._init_vad()

    def _init_vad(self):
        """
        Initializes VAD. Uses the robust adaptive energy-based baseline locally.
        If USE_SILERO_HUB=true is configured, attempts torch.hub.load.
        """
        import os
        use_hub = os.getenv("USE_SILERO_HUB", "false").lower() in ("true", "1")
        if use_hub:
            try:
                import torch
                model, utils = torch.hub.load(
                    repo_or_dir="snakers4/silero-vad",
                    model="silero_vad",
                    force_reload=False,
                    onnx=False,
                    trust_repo=True
                )
                self.silero_model = model
                self.silero_utils = utils
                self.silero_available = True
                logger.info("Silero VAD successfully loaded via torch.hub.")
                return
            except Exception as e:
                logger.info(f"Silero VAD torch.hub load error: {e}.")

        self.silero_available = False
        self.silero_model = None

    def detect_speech_segments_energy(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000
    ) -> List[Tuple[float, float]]:
        """
        Calculates speech vs non-speech segments using Short-Time RMS Energy (STE) with adaptive thresholding.
        - Frame size: 30ms (480 samples @ 16kHz)
        - Hop size: 10ms (160 samples @ 16kHz)
        """
        if len(audio) == 0:
            return []

        frame_len = int(0.030 * sample_rate)
        hop_len = int(0.010 * sample_rate)

        num_frames = max(1, (len(audio) - frame_len) // hop_len + 1)
        energies = np.zeros(num_frames, dtype=np.float32)

        for i in range(num_frames):
            start_idx = i * hop_len
            frame = audio[start_idx : start_idx + frame_len]
            energies[i] = np.sqrt(np.mean(frame**2) + 1e-12)

        # Adaptive threshold based on background noise floor and dynamic range
        sorted_e = np.sort(energies)
        noise_floor = np.median(sorted_e[: max(1, len(sorted_e) // 5)])
        max_e = np.percentile(energies, 95)

        threshold = max(0.008, float(noise_floor * 2.5 + (max_e - noise_floor) * 0.12))

        # Initial frame-level speech classification
        is_speech = energies > threshold

        # Smooth speech frames: close short non-speech gaps (< 200ms)
        min_gap_frames = int(0.200 / 0.010)
        gap_count = 0
        in_speech = False
        for i in range(len(is_speech)):
            if is_speech[i]:
                if gap_count < min_gap_frames and in_speech:
                    is_speech[i - gap_count : i] = True
                gap_count = 0
                in_speech = True
            else:
                if in_speech:
                    gap_count += 1

        # Extract contiguous speech segments
        segments: List[Tuple[float, float]] = []
        seg_start: Optional[float] = None
        min_speech_len = 0.150  # Ignore clicks/pops shorter than 150ms

        for i, speech_flag in enumerate(is_speech):
            t = i * 0.010
            if speech_flag and seg_start is None:
                seg_start = t
            elif not speech_flag and seg_start is not None:
                if (t - seg_start) >= min_speech_len:
                    segments.append((round(seg_start, 3), round(t, 3)))
                seg_start = None

        if seg_start is not None:
            total_t = len(audio) / sample_rate
            if (total_t - seg_start) >= min_speech_len:
                segments.append((round(seg_start, 3), round(total_t, 3)))

        return segments

    def detect_speech_segments(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000
    ) -> Tuple[List[Tuple[float, float]], str]:
        """
        Runs VAD to detect speech intervals.
        Returns:
            (list of (start_time, end_time) tuples, method_name)
        """
        if self.silero_available and self.silero_model is not None:
            try:
                import torch
                get_speech_timestamps = self.silero_utils[0]
                audio_tensor = torch.from_numpy(audio).float()
                timestamps = get_speech_timestamps(
                    audio_tensor,
                    self.silero_model,
                    sampling_rate=sample_rate,
                    min_speech_duration_ms=150,
                    min_silence_duration_ms=int(self.min_pause_duration * 1000)
                )
                segments = [
                    (round(ts["start"] / sample_rate, 3), round(ts["end"] / sample_rate, 3))
                    for ts in timestamps
                ]
                if segments:
                    return segments, "Silero VAD (torch.hub)"
            except Exception as e:
                logger.warning(f"Silero VAD execution error: {e}. Falling back to energy baseline.")

        # Robust energy fallback
        return self.detect_speech_segments_energy(audio, sample_rate), "Adaptive Energy-Based VAD Baseline"

    @staticmethod
    def detect_filler_words(transcript: str) -> FillerWordAnalysis:
        """
        Detects filler words in the candidate's transcript using token-aware matching.
        Covers canonical filler words: 'um', 'uh', 'er', 'erm', 'ah', 'like' (contextual).
        Does NOT count everyday legitimate uses of 'like' (e.g. 'I like Python', 'looks like a hash').
        """
        if not transcript or not transcript.strip():
            return FillerWordAnalysis(
                total_filler_count=0,
                filler_counts={},
                filler_words_detected=[],
                detected_instances=[]
            )

        words = transcript.strip().split()
        counts: Dict[str, int] = {}
        instances: List[FillerWordInstance] = []

        # Canonical hesitation fillers (unambiguous)
        hesitation_regex = re.compile(r"^(um+|uh+|er+|erm+|ah+)$", re.IGNORECASE)

        for idx, raw_word in enumerate(words):
            clean_token = re.sub(r"^[^\w]+|[^\w]+$", "", raw_word).lower()

            if hesitation_regex.match(clean_token):
                counts[clean_token] = counts.get(clean_token, 0) + 1
                # Context snippet (prev 2 words + word + next 2 words)
                start_c = max(0, idx - 2)
                end_c = min(len(words), idx + 3)
                context = " ".join(words[start_c:end_c])
                instances.append(
                    FillerWordInstance(
                        word=clean_token,
                        position_index=idx,
                        surrounding_context=context
                    )
                )

            # Contextual 'like' detection as filler
            elif clean_token == "like":
                # Check surrounding context:
                # 1. Punctuation around like: ", like," or "... like"
                has_punct = bool(re.search(r"[,;—\-\.]$", raw_word)) or (idx > 0 and bool(re.search(r"[,;—\-\.]$", words[idx-1])))
                # 2. Adjacent to another filler word (e.g. "uh like")
                adjacent_filler = False
                if idx > 0 and hesitation_regex.match(re.sub(r"\W+", "", words[idx-1]).lower()):
                    adjacent_filler = True
                if idx < len(words) - 1 and hesitation_regex.match(re.sub(r"\W+", "", words[idx+1]).lower()):
                    adjacent_filler = True
                # 3. Sentence-starting or clause-starting "Like, we could..."
                starts_clause = (idx == 0) or (idx > 0 and words[idx-1].endswith((".", "!", "?")))

                if has_punct or adjacent_filler or starts_clause:
                    counts["like (filler)"] = counts.get("like (filler)", 0) + 1
                    start_c = max(0, idx - 2)
                    end_c = min(len(words), idx + 3)
                    context = " ".join(words[start_c:end_c])
                    instances.append(
                        FillerWordInstance(
                            word="like (filler)",
                            position_index=idx,
                            surrounding_context=context
                        )
                    )

        total_count = sum(counts.values())
        detected_words = list(counts.keys())

        return FillerWordAnalysis(
            total_filler_count=total_count,
            filler_counts=counts,
            filler_words_detected=detected_words,
            detected_instances=instances
        )

    def analyze(
        self,
        audio_16k: np.ndarray,
        sample_rate: int = 16000,
        transcript: str = ""
    ) -> AudioAnalysisResponse:
        """
        Executes end-to-end audio feature extraction:
        - Speech/Silence intervals & Durations
        - Within-answer pauses vs Initial/Trailing silence
        - Speaking Rate (WPM) & Articulation Rate
        - Filler-Word analysis
        """
        total_duration = float(len(audio_16k)) / float(max(1, sample_rate))

        # 1. Voice Activity Detection
        speech_raw_segments, vad_method = self.detect_speech_segments(audio_16k, sample_rate)

        speech_intervals: List[SpeechInterval] = []
        pause_intervals: List[PauseInterval] = []

        total_speech_duration = 0.0
        for seg in speech_raw_segments:
            dur = round(seg[1] - seg[0], 2)
            total_speech_duration += dur
            speech_intervals.append(SpeechInterval(start=seg[0], end=seg[1], duration=dur))

        # 2. Silence & Pause Categorization
        # Distinguish initial silence, within-answer pauses, and trailing silence
        initial_silence = 0.0
        trailing_silence = 0.0

        if speech_raw_segments:
            initial_silence = round(speech_raw_segments[0][0], 2)
            trailing_silence = round(max(0.0, total_duration - speech_raw_segments[-1][1]), 2)

            # Within-answer pauses (strictly between consecutive speech intervals)
            for i in range(len(speech_raw_segments) - 1):
                pause_start = speech_raw_segments[i][1]
                pause_end = speech_raw_segments[i + 1][0]
                pause_dur = round(pause_end - pause_start, 2)
                if pause_dur >= self.min_pause_duration:
                    pause_intervals.append(
                        PauseInterval(start=pause_start, end=pause_end, duration=pause_dur)
                    )
        else:
            # Entire recording was silence
            initial_silence = round(total_duration, 2)

        pause_count = len(pause_intervals)
        avg_pause_duration = (
            round(sum(p.duration for p in pause_intervals) / pause_count, 2)
            if pause_count > 0
            else 0.0
        )
        longest_pause_duration = (
            max([p.duration for p in pause_intervals], default=0.0)
        )

        total_silence_duration = round(max(0.0, total_duration - total_speech_duration), 2)
        speech_ratio = round(total_speech_duration / max(0.01, total_duration), 2)

        # Pauses per minute (using response duration in minutes)
        duration_minutes = total_duration / 60.0
        pauses_per_minute = (
            round(pause_count / duration_minutes, 1) if duration_minutes > 0 else 0.0
        )

        # 3. Speaking Rate Calculations
        words = transcript.strip().split() if transcript else []
        total_words = len(words)

        # Words Per Minute (WPM) using total audio duration
        wpm = round((total_words / max(0.1, total_duration)) * 60.0, 1)

        # Articulation Rate (WPM) using active speech-only duration
        articulation_wpm = round(
            (total_words / max(0.1, total_speech_duration)) * 60.0, 1
        )

        # 4. Filler-Word Analysis
        filler_analysis = self.detect_filler_words(transcript)

        return AudioAnalysisResponse(
            total_duration_seconds=round(total_duration, 2),
            speech_duration_seconds=round(total_speech_duration, 2),
            silence_duration_seconds=total_silence_duration,
            speech_ratio=speech_ratio,
            pause_count=pause_count,
            average_pause_duration=avg_pause_duration,
            longest_pause_duration=round(longest_pause_duration, 2),
            pauses_per_minute=pauses_per_minute,
            initial_silence_seconds=initial_silence,
            trailing_silence_seconds=trailing_silence,
            total_words=total_words,
            words_per_minute=wpm,
            articulation_rate_wpm=articulation_wpm,
            filler_words=filler_analysis,
            speech_intervals=speech_intervals,
            pause_intervals=pause_intervals,
            method=vad_method,
            vad_model=vad_method,
            wav2vec_status="Optional feature extractor (Interface defined)",
            learned_delivery_score=None
        )

    def extract_wav2vec_features(self, audio_data: np.ndarray) -> Dict[str, Any]:
        """
        Planned wav2vec 2.0 dense representation extraction interface (Phase 2/3 Roadmap).
        """
        return {
            "status": "planned_module",
            "model_name": "facebook/wav2vec2-base-960h",
            "message": "Future milestone: will extract dense latent speech representations for human-rated score regression."
        }
