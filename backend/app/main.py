import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as legacy_router
from .api.auth import router as auth_router, users_router
from .api.interviews import router as interviews_router
from .api.progress import router as progress_router
from .services.text_encoder import TextEncoder
from .services.text_assessor import TextAssessor
from .db.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("multimodal-interview-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and seed tracks/rubrics
    logger.info("Initializing SQLite/PostgreSQL Database...")
    init_db()
    logger.info("Database initialized with default interview tracks and rubrics.")

    # Startup: Pre-load the embedding model
    logger.info("Initializing Sentence-BERT embedding pipeline...")
    model_name = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    encoder = TextEncoder.get_instance(model_name=model_name)
    TextAssessor.get_instance()
    logger.info(f"Embedding pipeline ready. Model loaded: {encoder.is_loaded}")

    logger.info("Initializing Whisper speech-to-text pipeline...")
    from .services.audio_transcriber import AudioTranscriber
    transcriber = AudioTranscriber.get_instance()
    logger.info(f"Whisper pipeline ready. Model loaded: {transcriber.is_loaded}")
    yield
    # Shutdown
    logger.info("Application shutting down.")

app = FastAPI(
    title="Multimodal AI-Based Interview Assessment API",
    description="Backend API for real-time voice and text interview performance assessment, rubric evaluations, and progress tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes under /api/v1
app.include_router(legacy_router)  # Already has prefix="/api/v1"
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(interviews_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "project": "Multimodal AI-Based Interview Performance Assessment System",
        "version": "1.0.0",
        "tracks": ["Sales Interview", "Software Engineering Bug-Fixing"],
        "docs_url": "/docs",
        "health_url": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
