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
    </div>
  );
};
