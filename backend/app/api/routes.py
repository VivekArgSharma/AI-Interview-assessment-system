import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form

from ..schemas.assessment import (
    HealthResponse,
    RoleQuestions,
    AssessRequest,
    AssessResponse,
    MetricsResponse,
    AudioTranscriptionResponse,
    AudioAnalysisResponse
)
from ..data.question_bank import QUESTION_BANK
from ..services.text_encoder import TextEncoder
from ..services.text_assessor import TextAssessor
from ..services.audio_transcriber import AudioTranscriber
from ..services.audio_feature_extractor import AudioFeatureExtractor
from ..evaluation.evaluation_metrics import ModelEvaluator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["interview-assessment"])

# Maximum audio upload size: 25 MB
MAX_AUDIO_BYTES = 25 * 1024 * 1024

@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """
    Returns backend operational status, Sentence-BERT embedding status, Whisper status, and VAD status.
    """
    encoder = TextEncoder.get_instance()
    assessor = TextAssessor.get_instance()
    transcriber = AudioTranscriber.get_instance()
    extractor = AudioFeatureExtractor()

    return HealthResponse(
        status="healthy",
        model_name=encoder.model_name,
        model_loaded=encoder.is_loaded,
        whisper_model=transcriber.model_name,
        whisper_loaded=transcriber.is_loaded,
        vad_status="Silero VAD / Energy Baseline Active" if extractor.silero_available else "Adaptive Energy Baseline Active",
        wav2vec_status="Interface defined (Planned Phase 2/3)",
        device=encoder.device,
        assessment_method="sentence_bert_rubric_baseline",
        total_assessments_session=assessor.session_assessment_count,
        version="0.4.0"
    )

@router.get("/questions", response_model=Dict[str, RoleQuestions])
def get_questions() -> Dict[str, RoleQuestions]:
    """
    Returns the available interview roles and their structured question banks.
    """
    return QUESTION_BANK

@router.post("/audio/transcribe", response_model=AudioTranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> AudioTranscriptionResponse:
    """
    Transcribes spoken interview audio using pretrained Whisper and computes accompanying speech features.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes)."
        )

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds the maximum allowed size of {MAX_AUDIO_BYTES // (1024*1024)}MB."
        )

    transcriber = AudioTranscriber.get_instance()
    extractor = AudioFeatureExtractor()

    try:
        res = transcriber.transcribe(audio_bytes, filename=file.filename or "audio.wav")
        transcript = res["transcript"]

        # Run feature extractor on the transcribed audio array
        analysis = extractor.analyze(
            audio_16k=res["audio_16k"],
            sample_rate=res["sample_rate"],
            transcript=transcript
        )

        return AudioTranscriptionResponse(
            transcript=transcript,
            language=res["language"],
            duration_seconds=res["duration_seconds"],
            model_name=res["model_name"],
            status="success",
            word_count=res["word_count"],
            audio_analysis=analysis
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Error during audio transcription: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )

@router.post("/audio/analyze", response_model=AudioAnalysisResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None)
) -> AudioAnalysisResponse:
    """
    Extracts acoustic speech metrics: speech/silence duration, qualifying pauses,
    speaking rate (WPM and articulation rate), and filler word counts.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes)."
        )

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds the maximum allowed size of {MAX_AUDIO_BYTES // (1024*1024)}MB."
        )

    transcriber = AudioTranscriber.get_instance()
    extractor = AudioFeatureExtractor()

    try:
        # Read and resample audio
        audio_raw, sr = transcriber.read_audio_data(audio_bytes)
        audio_16k = transcriber.resample_to_16k(audio_raw, sr)

        final_transcript = transcript or ""
        # If no transcript provided, transcribe with Whisper
        if not final_transcript:
            trans_res = transcriber.transcribe(audio_bytes)
            final_transcript = trans_res["transcript"]

        analysis = extractor.analyze(
            audio_16k=audio_16k,
            sample_rate=16000,
            transcript=final_transcript
        )
        return analysis
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Error during audio analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio feature extraction failed: {str(e)}"
        )

@router.post("/assess", response_model=AssessResponse)
def assess_response(request: AssessRequest) -> AssessResponse:
    """
    Validates candidate response and executes the Sentence-BERT text assessment pipeline.
    Preserves existing text workflow; forwards speech modality metadata and descriptive audio metrics if present.
    """
    answer_clean = request.answer.strip()
    if len(answer_clean) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Answer must be at least 5 non-whitespace characters long."
        )

    if len(answer_clean) > 10000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Answer exceeds the maximum allowed length of 10,000 characters."
        )

    if request.role not in QUESTION_BANK:
        valid_roles = list(QUESTION_BANK.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{request.role}'. Valid roles are: {valid_roles}"
        )

    try:
        assessor = TextAssessor.get_instance()
        result = assessor.assess(request)
        return result
    except Exception as e:
        logger.error(f"Error during assessment pipeline: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment computation encountered an internal error: {str(e)}"
        )

@router.post("/assess/audio", response_model=AssessResponse)
async def assess_audio_response(
    file: UploadFile = File(...),
    question: str = Form(...),
    role: str = Form(...),
    question_id: Optional[str] = Form(None),
    edited_transcript: Optional[str] = Form(None)
) -> AssessResponse:
    """
    Direct spoken response evaluation endpoint:
    1. Transcribes audio via Whisper
    2. Extracts acoustic speech features (VAD, pauses, WPM, fillers)
    3. Runs Sentence-BERT text assessment on transcript
    4. Returns text assessment results and descriptive audio measurements separately.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes)."
        )

    transcriber = AudioTranscriber.get_instance()
    extractor = AudioFeatureExtractor()
    assessor = TextAssessor.get_instance()

    try:
        trans_res = transcriber.transcribe(audio_bytes, filename=file.filename or "audio.wav")
        transcript_raw = trans_res["transcript"]
        final_answer = (edited_transcript or transcript_raw).strip()

        if len(final_answer) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Transcribed answer ('{final_answer}') is too short (min 5 chars). Please speak more clearly or provide a longer answer."
            )

        analysis = extractor.analyze(
            audio_16k=trans_res["audio_16k"],
            sample_rate=trans_res["sample_rate"],
            transcript=final_answer
        )

        req = AssessRequest(
            question=question,
            answer=final_answer,
            role=role,
            question_id=question_id,
            mode="audio",
            audio_analysis=analysis
        )
        return assessor.assess(req)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during assess_audio_response: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio assessment pipeline failed: {str(e)}"
        )

@router.get("/metrics", response_model=Dict[str, Any])
def get_metrics() -> Dict[str, Any]:
    """
    Returns empirical evaluation metrics calculated on a synthetic calibration benchmark fixture.
    Clearly marks data as synthetic per Section 10 guidelines.
    """
    try:
        return ModelEvaluator.run_benchmark_evaluation()
    except Exception as e:
        logger.error(f"Error computing evaluation metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate evaluation metrics: {str(e)}"
        )
