import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./interview_app.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _auto_migrate_sqlite_columns():
    """
    Inspects SQLite tables and dynamically adds any newly declared model columns
    without wiping existing user data or breaking SQLite schemas.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    with engine.connect() as conn:
        # Check users table
        if inspector.has_table("users"):
            cols = {c["name"] for c in inspector.get_columns("users")}
            if "role" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'candidate'"))
                conn.commit()

        # Check interview_sessions table
        if inspector.has_table("interview_sessions"):
            cols = {c["name"] for c in inspector.get_columns("interview_sessions")}
            alterations = [
                ("role_id", "VARCHAR(36)"),
                ("mode", "VARCHAR(50) DEFAULT 'standard'"),
                ("scenario_id", "VARCHAR(50)"),
                ("video_enabled", "BOOLEAN DEFAULT 1"),
                ("needs_review", "BOOLEAN DEFAULT 0"),
                ("review_reason", "VARCHAR(100)"),
                ("candidate_consent", "JSON"),
                ("integrity_signals", "JSON")
            ]
            for col_name, col_type in alterations:
                if col_name not in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE interview_sessions ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass

        # Check questions table
        if inspector.has_table("questions"):
            cols = {c["name"] for c in inspector.get_columns("questions")}
            if "targeted_dimension" not in cols:
                try:
                    conn.execute(text("ALTER TABLE questions ADD COLUMN targeted_dimension VARCHAR(100)"))
                    conn.commit()
                except Exception:
                    pass

        # Check answers table
        if inspector.has_table("answers"):
            cols = {c["name"] for c in inspector.get_columns("answers")}
            if "t_start" not in cols:
                conn.execute(text("ALTER TABLE answers ADD COLUMN t_start FLOAT DEFAULT 0.0"))
            if "t_end" not in cols:
                conn.execute(text("ALTER TABLE answers ADD COLUMN t_end FLOAT DEFAULT 0.0"))
            conn.commit()

        # Check rubric_criteria table
        if inspector.has_table("rubric_criteria"):
            cols = {c["name"] for c in inspector.get_columns("rubric_criteria")}
            if "modality_source" not in cols:
                conn.execute(text("ALTER TABLE rubric_criteria ADD COLUMN modality_source VARCHAR(50) DEFAULT 'text'"))
                conn.commit()

        # Check audio_metrics table
        if inspector.has_table("audio_metrics"):
            cols = {c["name"] for c in inspector.get_columns("audio_metrics")}
            if "pitch_mean_hz" not in cols:
                conn.execute(text("ALTER TABLE audio_metrics ADD COLUMN pitch_mean_hz FLOAT DEFAULT 140.0"))
            if "pitch_std_hz" not in cols:
                conn.execute(text("ALTER TABLE audio_metrics ADD COLUMN pitch_std_hz FLOAT DEFAULT 24.0"))
            conn.commit()

        # Check reports table
        if inspector.has_table("reports"):
            cols = {c["name"] for c in inspector.get_columns("reports")}
            report_cols = [
                ("video_summary", "JSON"),
                ("overall_ci_low", "FLOAT"),
                ("overall_ci_high", "FLOAT"),
                ("drills", "JSON"),
                ("modality_breakdown", "JSON"),
                ("counterfactual_deltas", "JSON"),
                ("integrity_notes", "JSON")
            ]
            for c_name, c_type in report_cols:
                if c_name not in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE reports ADD COLUMN {c_name} {c_type}"))
                        conn.commit()
                    except Exception:
                        pass

def init_db():
    from ..models import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _auto_migrate_sqlite_columns()
    from .seed import seed_default_data
    seed_default_data()
