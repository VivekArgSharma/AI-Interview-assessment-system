import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  FileText,
  Volume2
} from 'lucide-react';
import { ApiService } from '../services/api';
import { RecruiterScorecardData } from '../types';

interface ScorecardPageProps {
  sessionId?: string;
  onBack: () => void;
}

export const ScorecardPage: React.FC<ScorecardPageProps> = ({
  sessionId = 'prism-demo-session-s1',
  onBack
}) => {
  const [scorecard, setScorecard] = useState<RecruiterScorecardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ablationMode, setAblationMode] = useState<'all' | 'without_voice' | 'without_video' | 'without_text'>('all');
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<number | null>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);

  const fallbackQuestions = [
    {
      question_id: 'q1_demo',
      sequence_number: 1,
      stage_name: 'Defect Origin Triage',
      question_type: 'initial',
      question_text: 'Walk me through your systematic strategy for locating defect origins when reproduction steps are intermittent.',
      targeted_dimension: 'Problem Decomposition & Concurrency',
      expected_concepts: ['thread contention', 'accumulator idempotency', 'network timeout retry storm'],
      candidate_transcript: 'When reproduction is intermittent, I first inspect distributed request traces and server metrics to identify whether latency spikes align with external network retry storms. In the accumulator worker, we saw duplicate increments because retries lacked deduplication.',
      audio_duration_seconds: 38.0,
      fused_score: 4.3,
      overall_ci: '[4.0 - 4.6]',
      ci_low: 4.0,
      ci_high: 4.6,
      std_error: 0.18,
      is_uncertain: false,
      text_metrics: {
        average_score: 4.4,
        rubric_items: [
          {
            criterion_name: 'Problem Decomposition',
            score: 4.5,
            max_score: 5.0,
            weight: 1.2,
            evidence: 'Isolated retry storm as root cause for duplicated accumulator state.',
            rationale: 'Demonstrated solid understanding of intermittent network triggers.',
            missing_elements: 'Could explicitly mention distributed lock contention.'
          }
        ]
      },
      voice_metrics: {
        speaking_rate_wpm: 138.0,
        articulation_rate_wpm: 148.0,
        pause_count: 4,
        total_pause_duration_seconds: 2.8,
        average_pause_sec: 0.7,
        filler_count: 1,
        status: 'Optimal Cadence'
      },
      video_metrics: {
        framing_stability: 0.94,
        gaze_at_camera_ratio: 0.88,
        descriptive_notes: 'Candidate maintained stable framing and forward eye contact.'
      },
      counterfactual_deltas: {
        marginal_voice_contribution: 0.12,
        marginal_video_contribution: 0.0,
        marginal_text_contribution: 0.28
      },
      integrity_signals: {
        tab_blurs: 0,
        pastes: 0
      },
      benchmark_exemplar: 'A senior engineer articulates systematic tracing, isolating failure boundary to network retries, and designing an idempotent deduplication set.'
    },
    {
      question_id: 'q2_demo',
      sequence_number: 2,
      stage_name: 'Architectural Hotfix vs Root Cause',
      question_type: 'follow_up',
      question_text: 'In your previous projects, how did you balance quick hotfixes against root-cause preventative architecture?',
      targeted_dimension: 'Trade-Off Awareness & Reliability',
      expected_concepts: ['feature flags', 'canary deployment', 'rollback strategy', 'technical debt ledger'],
      candidate_transcript: 'I separate immediate mitigation from preventative architecture. The hotfix must be small and guarded behind a feature flag or circuit breaker to restore availability immediately. Then we prioritize the permanent architectural refactor in the next sprint.',
      audio_duration_seconds: 42.0,
      fused_score: 4.1,
      overall_ci: '[3.8 - 4.4]',
      ci_low: 3.8,
      ci_high: 4.4,
      std_error: 0.21,
      is_uncertain: false,
      text_metrics: {
        average_score: 4.2,
        rubric_items: [
          {
            criterion_name: 'Trade-Off Awareness',
            score: 4.0,
            max_score: 5.0,
            weight: 1.0,
            evidence: 'Contrasted immediate circuit breaker hotfix with permanent architectural refactor.',
            rationale: 'Articulated trade-off between deployment velocity and stability.',
            missing_elements: 'Mentioning canary rollback criteria would strengthen the answer.'
          }
        ]
      },
      voice_metrics: {
        speaking_rate_wpm: 141.0,
        articulation_rate_wpm: 152.0,
        pause_count: 5,
        total_pause_duration_seconds: 3.2,
        average_pause_sec: 0.64,
        filler_count: 2,
        status: 'Optimal Cadence'
      },
      video_metrics: {
        framing_stability: 0.91,
        gaze_at_camera_ratio: 0.84,
        descriptive_notes: 'Stable framing maintained throughout explanation.'
      },
      counterfactual_deltas: {
        marginal_voice_contribution: 0.08,
        marginal_video_contribution: 0.0,
        marginal_text_contribution: 0.22
      },
      integrity_signals: {
        tab_blurs: 0,
        pastes: 1
      },
      benchmark_exemplar: 'Balances immediate availability stabilization with technical debt accountability and automated regression gating.'
    }
  ];

  const questionsList = (scorecard?.question_breakdown && scorecard.question_breakdown.length > 0)
    ? scorecard.question_breakdown
    : fallbackQuestions;

  const activeQuestion = questionsList[selectedQuestionIdx] || questionsList[0];

  useEffect(() => {
    loadScorecard();
  }, [sessionId]);

  const loadScorecard = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getRecruiterScorecard(sessionId);
      setScorecard(data);
    } catch (err) {
      console.error('Failed to load scorecard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayClip = (index: number) => {
    setActiveAudioPlaying(index);
    setTimeout(() => setActiveAudioPlaying(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500 font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading Recruiter Scorecard & Counterfactual Analysis...</p>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center font-sans">
        <p className="text-sm text-slate-600">Scorecard not found for session {sessionId}.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold mb-1 block">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiter Multimodal Scorecard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Candidate: <strong>{scorecard.candidate_name}</strong> • Role: <strong>{scorecard.role_title}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {scorecard.needs_review ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Review Queue Pending</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>High Confidence Settled</span>
            </span>
          )}
        </div>
      </div>

      {/* Overview Banner: Overall Score & Confidence Band */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Overall Multimodal Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900">{scorecard.overall_score}</span>
            <span className="text-slate-400 font-medium text-sm">/ 5.0</span>
          </div>
          <span className="text-xs font-mono font-medium text-indigo-600 mt-1 block">
            Calibrated 90% CI: {scorecard.overall_ci}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Modality Fused Split
          </span>
          <div className="text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Text Reasoning & Content:</span>
              <span className="font-semibold text-slate-900">80% weight</span>
            </div>
            <div className="flex justify-between">
              <span>Voice Pacing & Cadence:</span>
              <span className="font-semibold text-slate-900">20% weight</span>
            </div>
            <div className="flex justify-between">
              <span>Video Presentation:</span>
              <span className="font-semibold text-slate-400">0% (Descriptive only)</span>
            </div>
          </div>
        </div>

        {/* Counterfactual Modality View Switcher (D2) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">Counterfactual Modality View (D2)</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-snug">
            Re-score candidate responses excluding a specific modality to inspect its marginal delta contribution.
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => setAblationMode('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                ablationMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Modalities
            </button>
            <button
              onClick={() => setAblationMode('without_voice')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                ablationMode === 'without_voice'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Without Voice
            </button>
            <button
              onClick={() => setAblationMode('without_video')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                ablationMode === 'without_video'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Without Video
            </button>
            <button
              onClick={() => setAblationMode('without_text')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                ablationMode === 'without_text'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Without Text
            </button>
          </div>
        </div>
      </div>

      {/* Dimension Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Per-Dimension Calibrated Scores</h2>
          {ablationMode !== 'all' && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Active Counterfactual Filter: {ablationMode.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {scorecard.dimensions.map((dim, idx) => {
            const displayScore =
              ablationMode === 'without_voice'
                ? dim.counterfactual_deltas?.score_without_voice || dim.value
                : ablationMode === 'without_video'
                ? dim.counterfactual_deltas?.score_without_video || dim.value
                : ablationMode === 'without_text'
                ? dim.counterfactual_deltas?.score_without_text || dim.value
                : dim.value;

            const delta =
              ablationMode === 'without_voice'
                ? dim.counterfactual_deltas?.marginal_voice_contribution || 0
                : ablationMode === 'without_video'
                ? dim.counterfactual_deltas?.marginal_video_contribution || 0
                : ablationMode === 'without_text'
                ? dim.counterfactual_deltas?.marginal_text_contribution || 0
                : 0;

            return (
              <div key={idx} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{dim.dimension}</span>
                    {dim.is_uncertain && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Uncertain CI Width ({dim.ci_width})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {ablationMode !== 'all' && (
                      <span className={`text-xs font-mono font-bold ${delta >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        Marginal Contribution: {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {displayScore} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      CI: [{dim.ci_low} - {dim.ci_high}]
                    </span>
                  </div>
                </div>

                {/* Visual Error Bar Representation */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative mb-3">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${(displayScore / 5.0) * 100}%` }}
                  />
                  {/* CI band shadow */}
                  <div
                    className="absolute top-0 bottom-0 bg-indigo-300/50"
                    style={{
                      left: `${(dim.ci_low / 5.0) * 100}%`,
                      width: `${((dim.ci_high - dim.ci_low) / 5.0) * 100}%`
                    }}
                  />
                </div>

                {/* Evidence Clip excerpt if present */}
                {dim.evidence_clips && dim.evidence_clips.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-3">
                    <button
                      onClick={() => handlePlayClip(idx)}
                      className={`p-1.5 rounded-lg border transition-colors shrink-0 mt-0.5 ${
                        activeAudioPlaying === idx ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Play Evidence Clip"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Evidence Clip (00:{Math.round(dim.evidence_clips[0].t_start)} - 00:{Math.round(dim.evidence_clips[0].t_end)})
                      </span>
                      <p className="text-slate-800 italic mt-0.5">"{dim.evidence_clips[0].excerpt}"</p>
                      <p className="text-[11px] text-indigo-700 mt-1">{dim.evidence_clips[0].reason}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Anti-Cheating & Integrity Notes (Section 14 & FR21) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Anti-Cheating & Integrity Signals (PRD Section 14)
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Environment events (tab focus loss, paste counts) and adaptive constraint-change probe outcomes.
          Worded strictly as human-verifiable observations, never automated disqualifications.
        </p>

        <div className="space-y-2">
          {scorecard.integrity_notes.map((note, i) => (
            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Question Multimodal Metric Deep Dive (Company PRD Inspection Section) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Company Deep Dive
              </span>
              <h2 className="text-base font-bold text-slate-900">Per-Question Multimodal Inspection</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed performance analysis across Text Rubrics, Voice Prosody, Video Framing, and 5-Head Ensemble Uncertainty for each question.
            </p>
          </div>

          {/* Question Navigation Tabs */}
          {questionsList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {questionsList.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedQuestionIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedQuestionIdx === idx
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Q{idx + 1}: {q.stage_name || `Question ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Question Deep Inspection View */}
        {activeQuestion && (
          <div className="space-y-6">
            {/* Question Header & Fused Score Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700">
                    Stage: {activeQuestion.stage_name}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Dimension: {activeQuestion.targeted_dimension}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  "{activeQuestion.question_text}"
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Target Concepts:
                  </span>
                  {activeQuestion.expected_concepts.map((concept, ci) => (
                    <span
                      key={ci}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fused Question Score Badge */}
              <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Question Fused Score
                </span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">{activeQuestion.fused_score}</span>
                  <span className="text-slate-400 font-medium text-xs">/ 5.0</span>
                </div>
                <span className="text-xs font-mono font-medium text-indigo-600 block mt-0.5">
                  Calibrated CI: {activeQuestion.overall_ci}
                </span>
              </div>
            </div>

            {/* Candidate Transcript & Audio Answer Player */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Candidate Verbal Answer Transcript
                </span>

                {/* Candidate Audio Clip Player */}
                <button
                  onClick={() => handlePlayClip(999 + selectedQuestionIdx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    activeAudioPlaying === 999 + selectedQuestionIdx
                      ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    {activeAudioPlaying === 999 + selectedQuestionIdx
                      ? 'Playing Candidate Recording...'
                      : `Listen to Answer Audio (${Math.round(activeQuestion.audio_duration_seconds)}s)`}
                  </span>
                </button>
              </div>

              <p className="text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed italic">
                "{activeQuestion.candidate_transcript}"
              </p>
            </div>

            {/* Multimodal Metric Grid: Text, Voice, Video & Counterfactuals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Text & Rubric Metrics */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Text & Rubric
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {activeQuestion.text_metrics.average_score} / 5.0
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {activeQuestion.text_metrics.rubric_items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{item.criterion_name}</span>
                        <span className="font-mono text-indigo-600">{item.score} / 5</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">"{item.evidence}"</p>
                      <p className="text-[10px] text-slate-400">{item.missing_elements}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Voice & Speech Delivery Metrics */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    Voice & Prosody
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {activeQuestion.voice_metrics.speaking_rate_wpm} WPM
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pacing Cadence:</span>
                    <span
                      className={`font-semibold ${
                        activeQuestion.voice_metrics.speaking_rate_wpm >= 125 &&
                        activeQuestion.voice_metrics.speaking_rate_wpm <= 160
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {activeQuestion.voice_metrics.status}
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">Articulation Rate:</span>
                    <span className="font-bold text-slate-900">
                      {activeQuestion.voice_metrics.articulation_rate_wpm} WPM
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">Pause Intervals:</span>
                    <span className="text-slate-900">
                      {activeQuestion.voice_metrics.pause_count} pauses (avg {activeQuestion.voice_metrics.average_pause_sec}s)
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">Filler Words:</span>
                    <span
                      className={`font-bold ${
                        activeQuestion.voice_metrics.filler_count <= 2 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {activeQuestion.voice_metrics.filler_count} detected
                    </span>
                  </div>
                </div>

                {/* Counterfactual Marginal Delta */}
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-1">
                    Marginal Modality Deltas (D2)
                  </span>
                  <div className="flex justify-between font-mono text-[11px] text-slate-700">
                    <span>Voice Contribution:</span>
                    <span className="font-bold text-indigo-700">
                      {activeQuestion.counterfactual_deltas.marginal_voice_contribution >= 0
                        ? `+${activeQuestion.counterfactual_deltas.marginal_voice_contribution}`
                        : activeQuestion.counterfactual_deltas.marginal_voice_contribution}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Video, Presentation & Integrity */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Video & Integrity
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Descriptive</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">Framing Stability:</span>
                    <span className="font-bold text-slate-900">
                      {Math.round(activeQuestion.video_metrics.framing_stability * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">Gaze-at-Camera:</span>
                    <span className="font-bold text-slate-900">
                      {Math.round(activeQuestion.video_metrics.gaze_at_camera_ratio * 100)}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    {activeQuestion.video_metrics.descriptive_notes}
                  </p>
                </div>

                {/* Integrity Events */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Telemetry During Response
                  </span>
                  <div className="flex justify-between text-slate-700">
                    <span>Tab Blurs / Focus Losses:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeQuestion.integrity_signals.tab_blurs}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Editor Pastes:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeQuestion.integrity_signals.pastes}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Model Exemplar Comparison Bar */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                Target Benchmark Exemplar Standard
              </span>
              <p className="text-xs leading-relaxed text-slate-300">
                {activeQuestion.benchmark_exemplar}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

