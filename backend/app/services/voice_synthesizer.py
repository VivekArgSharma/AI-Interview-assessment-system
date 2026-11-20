import os
import hashlib
import logging
import asyncio
from typing import Dict, List, Any, Optional

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    edge_tts = None
    HAS_EDGE_TTS = False

logger = logging.getLogger(__name__)

# Ensure TTS cache directory exists
TTS_CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "storage", "audio", "tts_cache")
os.makedirs(TTS_CACHE_DIR, exist_ok=True)

CURATED_VOICES = [
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny (Natural / Warm)",
        "gender": "Female",
        "locale": "en-US",
        "role": "Warm Executive Recruiter & Coach",
        "description": "Natural, conversational tone with realistic inflection and friendly warmth."
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy (Natural / Authoritative)",
        "gender": "Male",
        "locale": "en-US",
        "role": "Senior Engineering Lead & Architect",
        "description": "Deep, confident, and professional pacing ideal for technical deep dives."
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria (Natural / Clear)",
        "gender": "Female",
        "locale": "en-US",
        "role": "Executive Assessment Director",
        "description": "Crisp articulation, high clarity, and engaging interview pacing."
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia (Natural / British)",
        "gender": "Female",
        "locale": "en-GB",
        "role": "Consultative Communication Mentor",
        "description": "Refined British English cadence with measured emphasis on strategic concepts."
    },
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher (Natural / Conversational)",
        "gender": "Male",
        "locale": "en-US",
        "role": "Hiring Manager & Career Coach",
        "description": "Approachable, empathetic delivery great for constructive speech coaching."
    }
]

class VoiceSynthesizer:
    _instance: Optional["VoiceSynthesizer"] = None

    def __init__(self):
        self.default_voice = "en-US-JennyNeural"
        self.cache_dir = os.path.abspath(TTS_CACHE_DIR)

    @classmethod
    def get_instance(cls) -> "VoiceSynthesizer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def clean_text_for_speech(text: str) -> str:
        """
        Cleans markdown formatting, removes code syntax markers, and adds
        micro-pauses for human conversational cadence.
        """
        if not text:
            return ""
        
        t = text.strip()
        # Remove bold/italic markdown
        t = t.replace("**", "").replace("*", "")
        t = t.replace("`", "")
        # Remove markdown headers
        lines = []
        for line in t.split("\n"):
            line = line.strip()
            if line.startswith("#"):
                line = line.lstrip("#").strip() + "."
            elif line.startswith("- ") or line.startswith("* "):
                line = "Also, " + line[2:].strip()
            lines.append(line)
        cleaned = " ".join(lines)
        return cleaned

    def _get_cache_filepath(self, text: str, voice: str, rate: str) -> str:
        key = f"{text}_{voice}_{rate}".encode("utf-8")
        h = hashlib.sha256(key).hexdigest()[:24]
        return os.path.join(self.cache_dir, f"tts_{h}.mp3")

    async def synthesize_to_file(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%"
    ) -> str:
        """
        Synthesizes text to an MP3 file using edge_tts with disk caching.
        Returns the absolute filepath to the MP3.
        """
        chosen_voice = voice or self.default_voice
        clean_text = self.clean_text_for_speech(text)
        if not clean_text:
            raise ValueError("Text to synthesize is empty.")

        filepath = self._get_cache_filepath(clean_text, chosen_voice, rate)
        if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
            return filepath

        if not HAS_EDGE_TTS or edge_tts is None:
            raise RuntimeError("edge_tts is not installed. Please run: pip install edge-tts")

        try:
            communicate = edge_tts.Communicate(text=clean_text, voice=chosen_voice, rate=rate)
            await communicate.save(filepath)
            logger.info(f"Synthesized voice audio saved to cache: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"edge_tts synthesis failed for voice {chosen_voice}: {e}", exc_info=True)
            raise RuntimeError(f"Voice synthesis failed: {str(e)}")

    async def synthesize_bytes(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%"
    ) -> bytes:
        filepath = await self.synthesize_to_file(text, voice, rate)
        with open(filepath, "rb") as f:
            return f.read()

    @staticmethod
    def get_available_voices() -> List[Dict[str, Any]]:
        return CURATED_VOICES
