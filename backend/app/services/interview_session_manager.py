import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.models import (
    User,
    InterviewTrack,
    Rubric,
    RubricCriterion,
    InterviewSession,
    Question,
    Answer,
    AudioMetric,
    Assessment,
    Report
)
from .text_encoder import TextEncoder
from .report_generator import ReportGenerator

logger = logging.getLogger(__name__)

class InterviewSessionManager:
    """
    Orchestrates the multi-turn conversational interview state machine,
    stage progression, rubric evaluation, and adaptive follow-up generation.
    """

    def __init__(self, encoder: Optional[TextEncoder] = None):
        self.encoder = encoder or TextEncoder.get_instance()

    def create_session(
        self,
        db: Session,
        user: User,
        track_id: str,
        difficulty: str = "intermediate",
        duration_minutes: int = 10,
        voice_preference: str = "default"
    ) -> InterviewSession:
        track = db.query(InterviewTrack).filter(InterviewTrack.id == track_id, InterviewTrack.is_active == True).first()
        if not track:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview track '{track_id}' not found or inactive."
            )

        rubric = db.query(Rubric).filter(Rubric.track_id == track_id).order_by(Rubric.created_at.desc()).first()

        session = InterviewSession(
            user_id=user.id,
            track_id=track.id,
            rubric_version_id=rubric.id if rubric else None,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            voice_preference=voice_preference,
            status="created",
            current_stage_index=0,
            follow_up_count_current_stage=0,
            configuration={
                "total_stages": len(track.stages or []),
                "adaptive_followups_enabled": True
            }
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def _resolve_stage_prompt(stage: Dict[str, Any], difficulty: str) -> str:
        diff_prompts = stage.get("difficulty_prompts", {})
        if isinstance(diff_prompts, dict) and difficulty in diff_prompts:
            return diff_prompts[difficulty]
        return stage.get("prompt_template", "Let's begin the interview.")

    def start_session(self, db: Session, session_id: str, user: User) -> InterviewSession:
        session = self._get_session_with_ownership(db, session_id, user)
        if session.status == "completed":
            return session

        if session.status == "created":
            session.status = "in_progress"
            session.started_at = datetime.utcnow()

            # Create the initial question for Stage 0
            stages = session.track.stages or []
            if stages:
                stage_0 = stages[0]
                session.current_stage = stage_0.get("stage_id", "stage_1")

                prompt_text = self._resolve_stage_prompt(stage_0, session.difficulty)

                first_question = Question(
                    session_id=session.id,
                    question_text=prompt_text,
                    question_type="initial",
                    sequence_number=1,
                    interview_stage=stage_0.get("stage_id", "stage_1"),
                    context_notes=stage_0.get("description", ""),
                    expected_concepts=stage_0.get("expected_concepts", [])
                )
                db.add(first_question)

            db.commit()
            db.refresh(session)

        return session

    def get_current_question(self, db: Session, session_id: str, user: User) -> Optional[Question]:
        session = self._get_session_with_ownership(db, session_id, user)
        if session.status not in ["in_progress", "created"]:
            return None

        # Return latest question
        return db.query(Question).filter(Question.session_id == session.id).order_by(Question.sequence_number.desc()).first()

    def submit_answer(
        self,
        db: Session,
        session_id: str,
        user: User,
        question_id: str,
        transcript: str,
        audio_analysis: Optional[Dict[str, Any]] = None,
        audio_duration_seconds: float = 0.0,
        audio_storage_key: Optional[str] = None,
        is_edited: bool = False
    ) -> Dict[str, Any]:
        session = self._get_session_with_ownership(db, session_id, user)
        if session.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit answer. Session status is '{session.status}'."
            )

        question = db.query(Question).filter(Question.id == question_id, Question.session_id == session.id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found in this interview session."
            )

        clean_transcript = transcript.strip()
        if len(clean_transcript) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Answer transcript is too short (min 5 characters)."
            )

        # 1. Create Answer Record
        answer = Answer(
            session_id=session.id,
            question_id=question.id,
            transcript=clean_transcript,
            edited_transcript=clean_transcript if is_edited else None,
            audio_storage_key=audio_storage_key,
            audio_duration_seconds=audio_duration_seconds,
            transcription_status="success",
            assessment_status="completed"
        )
        db.add(answer)
        db.flush()

        # 2. Record Audio Metrics if present
        if audio_analysis:
            filler_data = audio_analysis.get("filler_words", {})
            metric = AudioMetric(
                answer_id=answer.id,
                speech_duration_seconds=audio_analysis.get("speech_duration_seconds", audio_duration_seconds),
                speaking_rate=audio_analysis.get("words_per_minute", 0.0),
                articulation_rate=audio_analysis.get("articulation_rate_wpm", 0.0),
                pause_count=audio_analysis.get("pause_count", 0),
                total_pause_duration_seconds=audio_analysis.get("silence_duration_seconds", 0.0),
                mean_pause_duration_seconds=audio_analysis.get("average_pause_duration", 0.0),
                longest_pause_seconds=audio_analysis.get("longest_pause_duration", 0.0),
                filler_count=filler_data.get("total_filler_count", 0) if isinstance(filler_data, dict) else 0,
                audio_quality_status="good",
                analysis_metadata=audio_analysis
            )
            db.add(metric)
            db.flush()

        # 3. Evaluate Rubric Criteria against Candidate Transcript
        stage_assessments = self._evaluate_answer_rubric(db, answer, question, clean_transcript)

        # 4. Determine Adaptive Progression (Follow-up vs Next Stage vs Completion)
        stages = session.track.stages or []
        current_idx = session.current_stage_index
        current_stage = stages[current_idx] if current_idx < len(stages) else None

        # Check if we should trigger an adaptive follow-up
        should_followup = False
        if (
            session.follow_up_count_current_stage == 0
            and current_stage
            and question.question_type == "initial"
        ):
            # Check if key concepts or criteria were missed or weak
            weak_scores = [a["score"] for a in stage_assessments if a["score"] <= 1]
            if len(weak_scores) >= 1 or len(clean_transcript.split()) < 15:
                should_followup = True

        total_q_count = db.query(Question).filter(Question.session_id == session.id).count()

        if should_followup and current_stage:
            # Generate adaptive follow-up question
            session.follow_up_count_current_stage = 1
            followup_prompt = current_stage.get("followup_prompt") or "Could you elaborate on the specific steps you would take?"
            
            follow_up_q = Question(
                session_id=session.id,
                question_text=followup_prompt,
                question_type="follow_up",
                sequence_number=total_q_count + 1,
                interview_stage=current_stage.get("stage_id", session.current_stage),
                context_notes=f"Follow-up probe for {current_stage.get('title', '')}",
                expected_concepts=current_stage.get("expected_concepts", [])
            )
            db.add(follow_up_q)
            db.commit()

            return {
                "answer_id": answer.id,
                "question_id": question.id,
                "stage": question.interview_stage,
                "transcript": clean_transcript,
                "next_action": "follow_up",
                "message": "Follow-up question generated to probe deeper into your answer.",
                "follow_up_question": follow_up_q,
                "next_question": None,
                "stage_assessments": stage_assessments,
                "audio_metrics": audio_analysis
            }

        # Otherwise: advance to next stage or finish
        session.current_stage_index += 1
        session.follow_up_count_current_stage = 0

        if session.current_stage_index >= len(stages):
            # Interview Completed!
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            db.commit()

            # Generate final aggregated report
            ReportGenerator.generate_session_report(session, db)

            return {
                "answer_id": answer.id,
                "question_id": question.id,
                "stage": question.interview_stage,
                "transcript": clean_transcript,
                "next_action": "completed",
                "message": "Interview completed! All stages have been assessed.",
                "follow_up_question": None,
                "next_question": None,
                "stage_assessments": stage_assessments,
                "audio_metrics": audio_analysis
            }
        else:
            # Advance to Next Stage
            next_stage = stages[session.current_stage_index]
            session.current_stage = next_stage.get("stage_id", f"stage_{session.current_stage_index + 1}")

            prompt_text = self._resolve_stage_prompt(next_stage, session.difficulty)

            next_q = Question(
                session_id=session.id,
                question_text=prompt_text,
                question_type="initial",
                sequence_number=total_q_count + 1,
                interview_stage=next_stage.get("stage_id", session.current_stage),
                context_notes=next_stage.get("description", ""),
                expected_concepts=next_stage.get("expected_concepts", [])
            )
            db.add(next_q)
            db.commit()

            return {
                "answer_id": answer.id,
                "question_id": question.id,
                "stage": question.interview_stage,
                "transcript": clean_transcript,
                "next_action": "next_stage",
                "message": f"Advancing to Stage {session.current_stage_index + 1}: {next_stage.get('title', '')}.",
                "follow_up_question": None,
                "next_question": next_q,
                "stage_assessments": stage_assessments,
                "audio_metrics": audio_analysis
            }

    def _evaluate_answer_rubric(
        self,
        db: Session,
        answer: Answer,
        question: Question,
        transcript: str
    ) -> List[Dict[str, Any]]:
        # Fetch criteria for track
        session = answer.session
        criteria = (
            db.query(RubricCriterion)
            .join(RubricCriterion.rubric)
            .filter(RubricCriterion.rubric.has(track_id=session.track_id))
            .all()
        )

        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", transcript) if len(s.strip()) > 3]
        if not sentences:
            sentences = [transcript]

        sentence_embs = self.encoder.encode(sentences)
        lower_transcript = transcript.lower()

        results = []

        for crit in criteria:
            crit_query = f"{crit.criterion_name}: {crit.description}"
            crit_emb = self.encoder.encode(crit_query).flatten()

            best_sim = -1.0
            best_sentence = ""

            for s_idx, s_text in enumerate(sentences):
                s_emb = sentence_embs[s_idx].flatten()
                sim = float(self.encoder.cosine_similarity(crit_emb, s_emb))
                if sim > best_sim:
                    best_sim = sim
                    best_sentence = s_text

            matched_keywords = [kw for kw in (crit.keywords or []) if kw.lower() in lower_transcript]
            keyword_ratio = len(matched_keywords) / max(1, len(crit.keywords or [1]))

            # Normalization
            normalized_sim = max(0.0, min(1.0, (best_sim - 0.20) / 0.55))
            score_metric = 0.65 * normalized_sim + 0.35 * keyword_ratio

            # Convert to 0 - 4 scale per PRD Section 10.2
            if score_metric >= 0.75 or (best_sim >= 0.55 and len(matched_keywords) >= 2):
                score = 4
                rationale = f"Thorough and well-supported coverage of {crit.criterion_name}."
                missing = None
            elif score_metric >= 0.55 or (best_sim >= 0.45):
                score = 3
                rationale = f"Strong relevant coverage of {crit.criterion_name}."
                missing = None
            elif score_metric >= 0.38 or (len(matched_keywords) >= 1 and best_sim >= 0.32):
                score = 2
                rationale = f"Partial coverage of {crit.criterion_name}."
                missing = f"Expand on: {crit.description}."
            elif score_metric >= 0.22 or len(matched_keywords) >= 1:
                score = 1
                rationale = f"Limited evidence of {crit.criterion_name}."
                missing = f"Missing core concepts: {crit.scoring_guidance}"
            else:
                score = 0
                rationale = f"No relevant evidence for {crit.criterion_name}."
                missing = f"Did not cover {crit.criterion_name}. Recommended focus: {crit.scoring_guidance}"

            # Verbatim quotation check: ensure quote actually exists in the transcript
            evidence = None
            if score >= 2 and best_sentence:
                # Sanitize evidence: must be an exact substring of transcript
                if best_sentence in transcript:
                    evidence = f'"{best_sentence}"'
                    if matched_keywords:
                        evidence += f" (Relevant concepts: {', '.join(matched_keywords[:3])})"

            assessment = Assessment(
                answer_id=answer.id,
                criterion_id=crit.id,
                score=score,
                confidence=round(score_metric, 2),
                rationale=rationale,
                evidence=evidence,
                missing_elements=missing,
                model_version="sentence_bert_rubric_v1.0"
            )
            db.add(assessment)

            results.append({
                "criterion_key": crit.criterion_key,
                "criterion_name": crit.criterion_name,
                "score": score,
                "maximum_score": crit.maximum_score,
                "rationale": rationale,
                "evidence": evidence,
                "missing_elements": missing
            })

        db.flush()
        return results

    def pause_session(self, db: Session, session_id: str, user: User) -> InterviewSession:
        session = self._get_session_with_ownership(db, session_id, user)
        if session.status == "in_progress":
            session.status = "paused"
            db.commit()
            db.refresh(session)
        return session

    def resume_session(self, db: Session, session_id: str, user: User) -> InterviewSession:
        session = self._get_session_with_ownership(db, session_id, user)
        if session.status == "paused":
            session.status = "in_progress"
            db.commit()
            db.refresh(session)
        return session

    def end_session(self, db: Session, session_id: str, user: User) -> Report:
        session = self._get_session_with_ownership(db, session_id, user)
        session.status = "completed"
        if not session.completed_at:
            session.completed_at = datetime.utcnow()
        db.commit()

        # Generate report
        report = ReportGenerator.generate_session_report(session, db)
        return report

    def _get_session_with_ownership(self, db: Session, session_id: str, user: User) -> InterviewSession:
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found."
            )
        # Verify ownership (or allow demo user access)
        if session.user_id and session.user_id != user.id and user.email != "demo@ai-interview.com":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this interview session."
            )
        return session
