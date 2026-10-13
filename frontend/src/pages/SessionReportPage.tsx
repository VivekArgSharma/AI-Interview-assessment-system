import React, { useState } from 'react';
import {
  Award,
  Mic,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Volume2,
  Quote,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  Clock
} from 'lucide-react';
import { SessionReportData } from '../types';

interface SessionReportPageProps {
  report: SessionReportData;
  onPracticeAgain: () => void;
  onViewProgress: () => void;
}

export const SessionReportPage: React.FC<SessionReportPageProps> = ({
  report,
  onPracticeAgain,
  onViewProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'history' | 'audio'>('rubric');

  const getScoreBadge = (score: number, maxScore: number = 4) => {
    switch (score) {
      case 4:
        return { label: '4/4 Thorough Coverage', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700' };
      case 3:
        return { label: '3/4 Strong Coverage', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-700' };
      case 2:
        return { label: '2/4 Partial Coverage', bg: 'bg-amber-950/80 text-amber-300 border-amber-700' };
      case 1:
        return { label: '1/4 Limited Evidence', bg: 'bg-rose-950/80 text-rose-300 border-rose-800' };
      default:
        return { label: '0/4 No Relevant Evidence', bg: 'bg-slate-800 text-slate-400 border-slate-750' };
    }
  };

  const delivery = report.delivery_summary || {};
  const hasAudio = delivery.has_audio;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800">
              Completed Session Report
            </span>
            <span className="text-xs text-slate-400">{report.track_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interview Performance Assessment</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            onClick={onPracticeAgain}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Again</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-slate-900 border border-slate-700 p-6 mb-6 shadow-md">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Executive Performance Summary
        </h2>
        <p className="text-sm text-slate-200 leading-relaxed font-sans">{report.summary}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Track</span>
            <span className="font-semibold text-white">{report.track_name}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Difficulty</span>
            <span className="font-semibold text-cyan-300 capitalize">{report.difficulty}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Allocated Duration</span>
            <span className="font-semibold text-white">{report.duration_minutes} minutes</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Total Q&A Turns</span>
            <span className="font-semibold text-emerald-400">{report.qa_history?.length || 0} answers</span>
          </div>
        </div>
      </div>

      {/* Decoupled Dimension Cards: Content Quality vs Speech Delivery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Dimension 1: Answer Content Quality */}
        <div className="bg-slate-900 border border-slate-700 p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Content Quality Assessment
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {report.content_score}% Score
              </span>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-750 mb-4 text-center">
              <div className="text-4xl font-extrabold text-white tracking-tight mb-1">
                {report.content_score}%
              </div>
              <p className="text-xs text-slate-400">
                Aggregated coverage across weighted rubric criteria
              </p>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 mb-4">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Evaluation Method:</span>
                <span className="font-mono text-slate-200">Sentence-BERT Rubric Vectorization</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Criteria Assessed:</span>
                <span className="font-mono text-slate-200">{report.criteria_breakdown?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * Content scores evaluate your problem decomposition, discovery, objection handling, and technical reasoning against the rubric.
          </div>
        </div>

        {/* Dimension 2: Speech Delivery Metrics */}
        <div className="bg-slate-900 border border-slate-700 p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Speech Delivery Metrics
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700">
                {hasAudio ? 'Acoustic VAD' : 'Text Input'}
              </span>
            </div>

            {hasAudio ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-850 border border-slate-750 text-center">
                  <div className="text-2xl font-bold text-white font-mono">{delivery.average_wpm || 0}</div>
                  <span className="text-[11px] text-slate-400">Speaking Rate (WPM)</span>
                </div>
                <div className="p-3 bg-slate-850 border border-slate-750 text-center">
                  <div className="text-2xl font-bold text-white font-mono">{delivery.average_articulation_rate || 0}</div>
                  <span className="text-[11px] text-slate-400">Articulation Rate (WPM)</span>
                </div>
                <div className="p-3 bg-slate-850 border border-slate-750 text-center">
                  <div className="text-2xl font-bold text-amber-400 font-mono">{delivery.total_pause_count || 0}</div>
                  <span className="text-[11px] text-slate-400">Pauses (≥0.4s)</span>
                </div>
                <div className="p-3 bg-slate-850 border border-slate-750 text-center">
                  <div className="text-2xl font-bold text-rose-400 font-mono">{delivery.total_filler_words || 0}</div>
                  <span className="text-[11px] text-slate-400">Filler Words (um, uh)</span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-850 border border-slate-750 text-center mb-4 text-xs text-slate-400">
                Spoken audio metrics were not recorded for this session. Use spoken microphone mode in your next practice session to measure WPM, pauses, and speech delivery.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * Speech metrics represent descriptive acoustic measurements and are never used to distort content scores.
          </div>
        </div>
      </div>

      {/* Strengths & Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Demonstrated Strengths</h3>
          </div>
          <ul className="space-y-2">
            {report.strengths?.map((str, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Target Growth Opportunities</h3>
          </div>
          <ul className="space-y-2">
            {report.improvement_areas?.map((imp, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                <span className="text-amber-400 mt-1">•</span>
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabs: Rubric Breakdown vs Turn-by-Turn History */}
      <div className="border-b border-slate-700 mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab('rubric')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'rubric'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Rubric Criteria & Transcript Evidence ({report.criteria_breakdown?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Question & Answer Conversation History ({report.qa_history?.length || 0})
        </button>
      </div>

      {/* Tab 1: Rubric Criteria & Verified Evidence */}
      {activeTab === 'rubric' && (
        <div className="space-y-4 mb-8">
          {report.criteria_breakdown?.map((crit) => {
            const badge = getScoreBadge(crit.score, crit.maximum_score);
            return (
              <div key={crit.criterion_id} className="bg-slate-900 border border-slate-700 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{crit.criterion_name}</h4>
                    <span className="text-[11px] text-slate-400">{crit.criterion_key}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 border uppercase tracking-wider ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">{crit.rationale}</p>

                {/* Verbatim Transcript Evidence Box */}
                {crit.evidence ? (
                  <div className="bg-slate-850 border-l-2 border-cyan-500 p-3 mb-3 text-xs text-slate-200 flex items-start gap-2.5">
                    <Quote className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block mb-0.5">
                        Transcript Evidence Grounding
                      </span>
                      <p className="italic text-slate-100">{crit.evidence}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-850/50 p-2 text-[11px] text-slate-500 italic mb-3">
                    No verbatim evidence identified in candidate response for this criterion.
                  </div>
                )}

                {crit.missing_elements && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 p-2.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px] block mb-0.5 text-amber-400">
                      Recommendation for Next Attempt:
                    </span>
                    {crit.missing_elements}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Turn-by-Turn History */}
      {activeTab === 'history' && (
        <div className="space-y-5 mb-8">
          {report.qa_history?.map((qa, idx) => (
            <div key={qa.question_id || idx} className="bg-slate-900 border border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-slate-800 text-cyan-300 border border-slate-700">
                  Turn {idx + 1} • {qa.stage || 'Interview Stage'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {qa.audio_duration_seconds ? `${qa.audio_duration_seconds.toFixed(1)}s audio` : 'Text Answer'}
                </span>
              </div>

              <div className="mb-3">
                <span className="text-[11px] text-slate-400 block font-semibold">AI Interviewer:</span>
                <p className="text-xs font-semibold text-white mt-0.5">"{qa.question_text}"</p>
              </div>

              <div className="bg-slate-850 border border-slate-750 p-3 mb-3">
                <span className="text-[11px] text-slate-400 block font-semibold">Candidate Response:</span>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">"{qa.transcript}"</p>
                {qa.has_audio && qa.answer_id && (
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-3">
                    <audio
                      controls
                      src={`/api/v1/answers/${qa.answer_id}/audio`}
                      className="h-8 max-w-sm rounded-none"
                    />
                    <span className="text-[11px] font-mono text-cyan-400">Play Spoken Response</span>
                  </div>
                )}
              </div>

              {qa.assessments && qa.assessments.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {qa.assessments.map((a, aIdx) => (
                    <span
                      key={aIdx}
                      className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300"
                    >
                      {a.criterion_name}: <strong className="text-white">{a.score}/4</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next Practice Recommendations Footer */}
      <div className="bg-slate-900 border border-cyan-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">Ready to Track Long-Term Improvement?</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            View your longitudinal criterion mastery and historical practice trends on your progress dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onViewProgress}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>View Progress Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
