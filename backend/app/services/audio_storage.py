import os
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "audio"))

class AudioStorageService:
    @classmethod
    def _ensure_dir(cls):
        os.makedirs(STORAGE_DIR, exist_ok=True)

    @classmethod
    def save_audio(cls, answer_id: str, audio_bytes: bytes) -> str:
        """
        Saves uploaded audio bytes to local storage as <answer_id>.wav.
        Returns the filename/key.
        """
        cls._ensure_dir()
        filename = f"{answer_id}.wav"
        filepath = os.path.join(STORAGE_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
        logger.info(f"Saved audio recording for answer {answer_id} ({len(audio_bytes)} bytes) at {filename}")
        return filename

    @classmethod
    def get_audio_filepath(cls, storage_key: Optional[str]) -> Optional[str]:
        """
        Returns absolute path to stored audio file if it exists and is secure.
        """
        if not storage_key:
            return None
        cls._ensure_dir()
        # Prevent directory traversal
        filename = os.path.basename(storage_key)
        filepath = os.path.join(STORAGE_DIR, filename)
        if os.path.exists(filepath):
            return filepath
        return None

    @classmethod
    def delete_audio(cls, storage_key: Optional[str]) -> bool:
        """
        Deletes audio file from storage.
        """
        if not storage_key:
            return False
        filepath = cls.get_audio_filepath(storage_key)
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
                logger.info(f"Deleted audio file: {storage_key}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete audio file {storage_key}: {e}")
        return False
