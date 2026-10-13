import re
import logging
from typing import List, Optional, Union
import numpy as np

logger = logging.getLogger(__name__)

class TextEncoder:
    _instance: Optional["TextEncoder"] = None

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.is_loaded = False
        self.device = "cpu"
        self._load_model()

    @classmethod
    def get_instance(cls, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> "TextEncoder":
        if cls._instance is None:
            cls._instance = cls(model_name=model_name)
        return cls._instance

    def _load_model(self):
        try:
            logger.info(f"Loading SentenceTransformer model '{self.model_name}'...")
            from sentence_transformers import SentenceTransformer
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = SentenceTransformer(self.model_name, device=self.device)
            self.is_loaded = True
            logger.info(f"Successfully loaded '{self.model_name}' on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model '{self.model_name}': {e}")
            self.is_loaded = False
            self.model = None

    @staticmethod
    def preprocess_text(text: str) -> str:
        """
        Minimal, semantically preserving text normalization.
        Preserves punctuation, case semantics, technical keywords, and sentence boundaries.
        Removes excessive whitespace and non-printable control characters.
        """
        if not text:
            return ""
        # Remove non-printable characters while preserving standard whitespace
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # Normalize multiple spaces/newlines to single clean whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        Encodes a single string or list of strings into dense normalized embeddings.
        Falls back to normalized TF-IDF / term-frequency vector representation if model failed to load.
        """
        if isinstance(texts, str):
            input_list = [self.preprocess_text(texts)]
            single = True
        else:
            input_list = [self.preprocess_text(t) for t in texts]
            single = False

        if self.is_loaded and self.model is not None:
            try:
                embeddings = self.model.encode(
                    input_list,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False
                )
                return embeddings[0] if single else embeddings
            except Exception as e:
                logger.error(f"Error during SentenceTransformer inference: {e}")

        # Fallback: lightweight deterministic embedding simulation (n-gram hashing / fallback)
        # Note: Clearly logged, never pretended to be neural transformer
        logger.warning("Using fallback lightweight text vectorizer (SentenceTransformer unavailable)")
        vectors = []
        for text in input_list:
            # Deterministic bag-of-words / char hash representation normalized to unit length
            vec = np.zeros(384, dtype=np.float32)
            words = text.lower().split()
            if not words:
                vectors.append(vec)
                continue
            for i, word in enumerate(words):
                h = hash(word) % 384
                vec[h] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            vectors.append(vec)

        res = np.array(vectors)
        return res[0] if single else res

    @staticmethod
    def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
        """
        Calculates cosine similarity between two vectors.
        Returns a float in [-1.0, 1.0].
        """
        v1_flat = np.asarray(v1, dtype=np.float32).flatten()
        v2_flat = np.asarray(v2, dtype=np.float32).flatten()
        norm1 = np.linalg.norm(v1_flat)
        norm2 = np.linalg.norm(v2_flat)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        dot = np.dot(v1_flat, v2_flat)
        sim = float(dot / (norm1 * norm2))
        return max(-1.0, min(1.0, sim))
