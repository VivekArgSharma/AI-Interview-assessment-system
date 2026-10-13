import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.models import (
    User,
    InterviewSession,
    Report,
    Assessment,
    RubricCriterion,
    Recommendation
)
from ..schemas.interview import (
    ProgressOverviewResponse,
    CriterionTrendItem,
    RecommendationItem
)
from .deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/overview", response_model=ProgressOverviewResponse)
def get_progress_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .all()
    )
    total_sessions = len(sessions)
    completed = [s for s in sessions if s.status == "completed"]
    total_minutes = sum(s.duration_minutes for s in completed)

    scores = []
    score_trend = []
    for s in sorted(completed, key=lambda x: x.started_at or x.created_at):
        if s.report:
            scores.append(s.report.content_score)
            score_trend.append({
                "date": s.completed_at.strftime("%b %d, %H:%M") if s.completed_at else s.created_at.strftime("%b %d"),
                "score": s.report.content_score,
                "track": s.track.name if s.track else "Interview",
                "difficulty": s.difficulty
            })

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return ProgressOverviewResponse(
        total_sessions=total_sessions,
        completed_sessions=len(completed),
        total_practice_minutes=total_minutes,
        average_content_score=avg_score,
        score_trend=score_trend[-10:]  # last 10 sessions
    )

@router.get("/criteria", response_model=List[CriterionTrendItem])
def get_criteria_trends(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Group assessments for user across completed sessions
    user_assessments = (
        db.query(Assessment)
        .join(Assessment.answer)
        .join(Assessment.answer.property.mapper.class_.session)
        .filter(InterviewSession.user_id == user.id, InterviewSession.status == "completed")
        .all()
    )

    criterion_stats: Dict[str, Dict[str, Any]] = {}
    for ass in user_assessments:
        if not ass.criterion:
            continue
        key = ass.criterion.criterion_key
        if key not in criterion_stats:
            criterion_stats[key] = {
                "name": ass.criterion.criterion_name,
                "scores": [],
                "max": ass.criterion.maximum_score
            }
        criterion_stats[key]["scores"].append(ass.score)

    results = []
    for key, data in criterion_stats.items():
        scores = data["scores"]
        avg = round(sum(scores) / len(scores), 2) if scores else 0.0
        mastery = round((avg / data["max"]) * 100.0, 1) if data["max"] > 0 else 0.0
        results.append(
            CriterionTrendItem(
                criterion_key=key,
                criterion_name=data["name"],
                average_score=avg,
                maximum_score=data["max"],
                attempts_count=len(scores),
                mastery_percentage=mastery
            )
        )

    # Sort by mastery ascending so weaknesses appear first
    results.sort(key=lambda x: x.mastery_percentage)
    return results

@router.get("/recommendations", response_model=List[RecommendationItem])
def get_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = (
        db.query(Recommendation)
        .join(Recommendation.session)
        .filter(InterviewSession.user_id == user.id, Recommendation.status == "active")
        .order_by(Recommendation.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        RecommendationItem(
            id=r.id,
            criterion_id=r.criterion_id,
            recommendation_text=r.recommendation_text,
            priority=r.priority,
            status=r.status
        )
        for r in recs
    ]
