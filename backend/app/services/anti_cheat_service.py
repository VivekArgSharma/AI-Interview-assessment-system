"""
Anti-LLM Teleprompter & Copilot Detection Service (Adversarial Anti-Cheat Engine).

Detects real-time AI teleprompter usage (Final Round AI, Interview Coder, ChatGPT voice/screen assistants)
via cognitive cadence fingerprinting, initial latency anomaly detection, syntactical reading cadence,
and dynamic mid-sentence constraint inversion traps.
"""

import re
import logging
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)

class AntiCheatService:
    """
    Adversarial Anti-Cheat & Real-Time LLM Teleprompter Detection Engine.
    """

    @classmethod
    def analyze_teleprompter_fingerprint(
        cls,
        transcript: str,
        audio_metrics: Optional[Dict[str, Any]] = None,
        initial_silence_sec: float = 0.0,
        video_metrics: Optional[Dict[str, Any]] = None,
        timestamp_sec: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates the Teleprompter Probability Score (0 - 100%) and generates timestamped evidence.
        
        Indicators analyzed:
        1. Latency-Burst Anomaly (Δτ): Long initial generation delay (2.5s - 5.5s) followed by high WPM burst.
        2. Reading Cadence vs. Spontaneous Thinking: High WPM (>165) combined with near-zero hesitation/filler frequency.
        3. LLM Transition Markers: Distinct syntactic markers ("Certainly", "First and foremost", "In order to achieve").
        4. Gaze Fixity: Looking at secondary display or rigid unblinking reading gaze.
        """
        metrics = audio_metrics or {}
        wpm = float(metrics.get("words_per_minute", 135.0))
        pause_count = int(metrics.get("pause_count", 3))
        filler_count = int(metrics.get("filler_count", 1))
        
        words = transcript.strip().split()
        word_count = len(words)
        
        anomaly_flags = []
        score_points = 0.0

        # Indicator 1: Latency-Burst Anomaly (Initial silent delay + high WPM speech burst)
        # Normal humans think while speaking (pauses distributed). Teleprompter users pause 3-5s then read non-stop.
        if (initial_silence_sec >= 2.8 and wpm >= 165) or (wpm >= 178 and pause_count <= 1 and word_count >= 30):
            score_points += 35.0
            anomaly_flags.append(
                f"Latency-Burst Anomaly at {int(timestamp_sec)}s: Initial {initial_silence_sec:.1f}s delay followed by rapid {int(wpm)} WPM reading burst without natural cognitive micro-pauses."
            )
        elif wpm >= 170:
            score_points += 15.0

        # Indicator 2: Syntactic Hesitation Depletion (Unnatural fluency on complex technical topics)
        # Spontaneous human speech on difficult topics has filler ratio 0.02 - 0.07. Teleprompter readers have ~0.
        if word_count >= 40:
            filler_ratio = filler_count / max(1, word_count)
            if filler_ratio < 0.005 and wpm >= 155:
                score_points += 25.0
                anomaly_flags.append(
                    f"Syntactic Hesitation Depletion: Zero organic hesitation or filler tokens detected across {word_count} words during complex explanation."
                )

        # Indicator 3: LLM Phrasing & Structural Archetypes
        llm_patterns = [
            r"\b(certainly|first and foremost|in summary|it is important to note|as an ai|in order to ensure that)\b",
            r"\b(furthermore|moreover|consequently|to delve deeper|on the one hand)\b",
            r"\b(optimal approach|trade-offs to consider include|robust and scalable solution)\b"
        ]
        llm_matches = 0
        for pat in llm_patterns:
            matches = re.findall(pat, transcript, re.IGNORECASE)
            llm_matches += len(matches)

        if llm_matches >= 2:
            score_points += 25.0
            anomaly_flags.append(
                f"LLM Structural Marker Detected: Detected {llm_matches} textbook generative AI introductory / transition phrases."
            )
        elif llm_matches == 1:
            score_points += 10.0

        # Indicator 4: Video Gaze Fixity (Reading from off-center screen or teleprompter app)
        if video_metrics:
            eye_contact = float(video_metrics.get("eye_contact_ratio", 0.85))
            head_var = float(video_metrics.get("head_pose_variance", 0.12))
            looking_away = int(video_metrics.get("looking_away_count", 0))

            # Rigid gaze: looking slightly above/side of webcam with zero natural head tilt
            if eye_contact >= 0.96 and head_var < 0.04 and word_count >= 35:
                score_points += 15.0
                anomaly_flags.append(
                    f"Teleprompter Visual Gaze Fixity: Unnaturally rigid ocular fixation ({int(eye_contact*100)}%) with suppressed natural micro-nodding."
                )
            elif eye_contact < 0.50 and looking_away >= 4:
                score_points += 15.0
                anomaly_flags.append(
                    f"Secondary Screen Divergence: Repeated downward/sideways gaze shifts ({looking_away}x) during response formulation."
                )

        # Compute Final Probability
        teleprompter_prob_pct = round(min(max(score_points, 5.0), 96.0), 1)
        
        if teleprompter_prob_pct >= 65.0:
            risk_tier = "HIGH_PROBABILITY"
            countermeasure = "DYNAMIC_CONSTRAINT_INJECTION"
        elif teleprompter_prob_pct >= 40.0:
            risk_tier = "SUSPICIOUS"
            countermeasure = "VERIFY_WITH_ADAPTIVE_PROBE"
        else:
            risk_tier = "ORGANIC_HUMAN"
            countermeasure = "NONE"

        return {
            "teleprompter_probability_pct": teleprompter_prob_pct,
            "risk_tier": risk_tier,
            "anomaly_flags": anomaly_flags,
            "recommended_countermeasure": countermeasure,
            "speech_wpm": round(wpm, 1),
            "filler_count": filler_count,
            "word_count": word_count,
            "timestamp_sec": timestamp_sec,
            "audit_verdict": (
                "High probability candidate is reading real-time AI copilot / teleprompter generation."
                if risk_tier == "HIGH_PROBABILITY" else
                "Suspicious reading cadence detected; adaptive constraint mutation recommended."
                if risk_tier == "SUSPICIOUS" else
                "Spontaneous organic human response formulation confirmed."
            )
        }

    @classmethod
    def synthesize_constraint_inversion_trap(
        cls,
        parent_question: str,
        current_answer: str,
        target_topic: str = "concurrency"
    ) -> str:
        """
        Generates an unexpected, localized constraint mutation that breaks real-time LLM teleprompters.
        Teleprompter assistants (Final Round, Interview Coder) experience 3-5s lag on sudden mid-dialogue
        constraint mutations, exposing the candidate immediately.
        """
        top_low = target_topic.lower()
        if "cache" in top_low or "redis" in top_low:
            return (
                "Wait, before you proceed with that design: assume Redis is strictly memory-capped at 64MB "
                "and network partitions cause 20% dropped packets. How does your lock eviction and retry strategy mutate right now?"
            )
        elif "payment" in top_low or "transaction" in top_low or "order" in top_low:
            return (
                "Quick constraint shift: what if the downstream payment provider is non-idempotent and charges the card on "
                "read requests as well? How do you prevent financial reconciliation corruption without locking the database row?"
            )
        else:
            return (
                "Hold on a moment—suppose an executive decree forbids all external dependencies and mandates O(1) space complexity. "
                "How does your algorithm adapt on the fly?"
            )
