import logging
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.models import (
    InterviewSession,
    Question,
    Answer,
    AudioMetric,
    Assessment,
    Report,
    Recommendation,
    RubricCriterion
)

logger = logging.getLogger(__name__)

class ReportGenerator:
    """
    Generates a structured final interview report across all turns of an interview session.
    Keeps content quality assessment strictly separated from speech delivery measurements.
    """

    @staticmethod
    def generate_session_report(session: InterviewSession, db: Session) -> Report:
        # Check if report already exists
        existing_report = db.query(Report).filter(Report.session_id == session.id).first()
        if existing_report:
            return existing_report

        # 1. Collect all answers and assessments
        answers = db.query(Answer).filter(Answer.session_id == session.id).all()
        assessments: List[Assessment] = []
        for ans in answers:
            assessments.extend(ans.assessments)

        # 2. Compute Content Score based on criteria coverage
        # Group assessments by criterion_id to get best or average score per criterion
        criterion_scores: Dict[str, List[int]] = {}
        for ass in assessments:
            if ass.criterion_id not in criterion_scores:
                criterion_scores[ass.criterion_id] = []
            criterion_scores[ass.criterion_id].append(ass.score)

        # Load rubric criteria for track
        track_criteria = (
            db.query(RubricCriterion)
            .join(RubricCriterion.rubric)
            .filter(RubricCriterion.rubric.has(track_id=session.track_id))
            .all()
        )

        total_weight = 0.0
        weighted_points = 0.0
        strengths: List[str] = []
        improvement_areas: List[str] = []
        criteria_breakdown: List[Dict[str, Any]] = []

        for crit in track_criteria:
            scores = criterion_scores.get(crit.id, [0])
            # Use the candidate's maximum achieved score across initial question + follow-up
            best_score = max(scores) if scores else 0
            weight = crit.weight or 1.0
            total_weight += weight * crit.maximum_score
            weighted_points += weight * best_score

            # Find matching assessment with evidence
            crit_assessment = next((a for a in assessments if a.criterion_id == crit.id and a.score == best_score), None)
            evidence = crit_assessment.evidence if crit_assessment else None
            rationale = crit_assessment.rationale if crit_assessment else "Not covered during interview."
            missing = crit_assessment.missing_elements if crit_assessment else crit.scoring_guidance

            crit_dict = {
                "criterion_id": crit.id,
                "criterion_key": crit.criterion_key,
                "criterion_name": crit.criterion_name,
                "score": best_score,
                "maximum_score": crit.maximum_score,
                "weight": weight,
                "evidence": evidence,
                "rationale": rationale,
                "missing_elements": missing
            }
            criteria_breakdown.append(crit_dict)

            if best_score >= 3:
                strengths.append(f"Strong performance on {crit.criterion_name}: {rationale}")
            elif best_score <= 1:
                improvement_areas.append(f"Growth opportunity in {crit.criterion_name}: {missing or rationale}")

        content_score = round((weighted_points / total_weight * 100.0), 1) if total_weight > 0 else 0.0

        # If few strengths/improvements emerged, provide helpful fallback observations
        if not strengths:
            strengths.append("Completed the interview and attempted all presented stages.")
        if not improvement_areas:
            improvement_areas.append("Continue practicing with advanced difficulty scenarios to refine edge-case reasoning.")

        # 3. Aggregate Speech Delivery Metrics from AudioMetric
        audio_metrics = (
            db.query(AudioMetric)
            .join(AudioMetric.answer)
            .filter(Answer.session_id == session.id)
            .all()
        )

        if audio_metrics:
            valid_wpms = [m.speaking_rate for m in audio_metrics if m.speaking_rate > 0]
            valid_art = [m.articulation_rate for m in audio_metrics if m.articulation_rate > 0]
            total_pauses = sum(m.pause_count for m in audio_metrics)
            total_pause_sec = sum(m.total_pause_duration_seconds for m in audio_metrics)
            total_fillers = sum(m.filler_count for m in audio_metrics)
            total_speech_sec = sum(m.speech_duration_seconds for m in audio_metrics)

            delivery_summary = {
                "has_audio": True,
                "average_wpm": round(sum(valid_wpms) / len(valid_wpms), 1) if valid_wpms else 0.0,
                "average_articulation_rate": round(sum(valid_art) / len(valid_art), 1) if valid_art else 0.0,
                "total_pause_count": total_pauses,
                "total_pause_duration_seconds": round(total_pause_sec, 1),
                "average_pause_duration_seconds": round(total_pause_sec / max(1, total_pauses), 2),
                "total_filler_words": total_fillers,
                "total_speech_duration_seconds": round(total_speech_sec, 1),
                "evaluative_note": (
                    "Acoustic delivery metrics reflect measurable speech characteristics (WPM, pauses, filler words). "
                    "These metrics are reported descriptively and are held strictly separate from rubric content grading."
                )
            }
        else:
            delivery_summary = {
                "has_audio": False,
                "note": "Responses were provided in text mode or audio metrics were not captured."
            }

        # 4. Synthesize Executive Summary
        track_name = session.track.name if session.track else "Interview"
        summary = (
            f"Candidate completed the {track_name} ({session.difficulty.capitalize()} level) across {len(answers)} recorded turns. "
            f"Achieved a content evaluation score of {content_score}%. "
            f"Demonstrated solid competence in {len([c for c in criteria_breakdown if c['score'] >= 3])} of {len(track_criteria)} evaluated rubric criteria."
        )

        # 5. Create Report Record
        report = Report(
            session_id=session.id,
            summary=summary,
            content_score=content_score,
            delivery_summary=delivery_summary,
            overall_score=content_score,
            strengths=strengths,
            improvement_areas=improvement_areas,
            score_configuration={
                "method": "weighted_rubric_sentence_bert",
                "max_score": 100.0,
                "criteria_breakdown": criteria_breakdown
            }
        )
        db.add(report)

        # 6. Create Targeted Recommendations
        for item in criteria_breakdown:
            if item["score"] <= 1:
                rec = Recommendation(
                    session_id=session.id,
                    criterion_id=item["criterion_key"],
                    recommendation_text=f"Focus on {item['criterion_name']}: {item['missing_elements']}",
                    priority="high",
                    status="active"
                )
                db.add(rec)
            elif item["score"] == 2:
                rec = Recommendation(
                    session_id=session.id,
                    criterion_id=item["criterion_key"],
                    recommendation_text=f"Refine {item['criterion_name']}: incorporate more specific examples and metrics.",
                    priority="medium",
                    status="active"
                )
                db.add(rec)

        db.commit()
        db.refresh(report)
        return report
