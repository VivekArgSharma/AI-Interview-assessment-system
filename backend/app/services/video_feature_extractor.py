"""
Video Feature Extractor Interface (Planned Future Modality)

Target Architecture:
- Observable visual features extracted using Vision Transformers or MediaPipe/OpenFace:
  - Face visibility and frame centering ratio
  - Head orientation / gaze stability
  - Gesture frequency
- Strictly avoids pseudo-scientific inference of personality, honesty, or subjective traits from appearance.

Status: Planned (Not yet implemented in Phase 1 MVP).
"""

from typing import Dict, Any

class VideoFeatureExtractor:
    def __init__(self, model_name: str = "google/mediapipe-face-mesh"):
        self.model_name = model_name
        self.is_implemented = False

    def extract_features(self, video_frames_or_path: Any) -> Dict[str, Any]:
        raise NotImplementedError(
            "VideoFeatureExtractor is planned for Phase 2. Extracts face orientation and gaze tracking observables."
        )
