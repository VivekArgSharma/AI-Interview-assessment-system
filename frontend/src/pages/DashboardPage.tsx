import React from 'react';
import {
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Bug,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { InterviewTrack, SessionHistoryItem, User } from '../types';

interface DashboardPageProps {
  tracks: InterviewTrack[];
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onOpenSetupModal: (trackId?: string) => void;
  history: SessionHistoryItem[];
  onViewReportById: (sessionId: string) => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onOpenSetupModal,
  history,
  onViewReportById,
  currentUser,
  onOpenAuthModal,
}) => {
  return (
    <div className="space-y-8 py-6 max-w-6xl mx-auto px-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-700 p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800">
                AI Interview Practice & Coaching
              </span>
              <span className="text-xs text-slate-400">PRD 1.0 Multimodal Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Master Your Spoken Interview Performance
            </h1>
          </div>

          <button
            onClick={() => onOpenSetupModal(selectedTrackId)}
            className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg self-start sm:self-auto shrink-0"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Start Practice Interview</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Simulate realistic job interviews with an AI interviewer. Speak your responses naturally, experience adaptive follow-up questions, and receive structured evidence-based evaluations that separate answer content from speech delivery.
        </p>

        {currentUser && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Welcome back, <strong className="text-white">{currentUser.display_name}</strong></span>
            <button
              onClick={onOpenAuthModal}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Account Preferences →
            </button>
          </div>
        )}
      </div>

      {/* Official PRD Interview Tracks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Select Practice Track
            </h2>
            <p className="text-xs text-slate-400">
              Two focused interview tracks defined in PRD Section 4
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 hidden sm:block">
            Multi-stage conversational evaluations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Track Card */}
          <div
            onClick={() => onSelectTrack('sales')}
            className={`p-6 border cursor-pointer transition-all flex flex-col justify-between ${
              selectedTrackId === 'sales'
                ? 'bg-slate-850 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md'
                : 'bg-slate-900 border-slate-750 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-950/80 border border-cyan-700 flex items-center justify-center text-cyan-400">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sales Interview Track</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Non-Technical Consultative Sales
                    </span>
                  </div>
                </div>

                {selectedTrackId === 'sales' ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Select</span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Simulates real-world prospect discovery and objection handling. Evaluates customer discovery questions, value proposition, handling price resistance, and closing strategy.
              </p>

              {/* Stages List */}
              <div className="mb-4 space-y-1.5 bg-slate-900/60 p-3 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  5 Conversational Stages:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <span>1. Customer Discovery</span>
                  <span>2. Understanding Needs</span>
                  <span>3. Value Proposition</span>
                  <span>4. Objection Handling</span>
                  <span>5. Closing & Next Steps</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSetupModal('sales');
              }}
              className="w-full py-2 bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <span>Setup Sales Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Software Engineering Bug-Fixing Track Card */}
          <div
            onClick={() => onSelectTrack('bug_fixing')}
            className={`p-6 border cursor-pointer transition-all flex flex-col justify-between ${
              selectedTrackId === 'bug_fixing'
                ? 'bg-slate-850 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md'
                : 'bg-slate-900 border-slate-750 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-950/80 border border-emerald-700 flex items-center justify-center text-emerald-400">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Bug-Fixing Interview Track</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Technical Software Engineering
                    </span>
                  </div>
                </div>

                {selectedTrackId === 'bug_fixing' ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Select</span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Presents a software bug scenario (API duplicates, retry non-idempotency). Evaluates problem decomposition, competing hypotheses, diagnostic steps, root cause deduction, and regression testing.
              </p>

              {/* Stages List */}
              <div className="mb-4 space-y-1.5 bg-slate-900/60 p-3 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  6 Conversational Stages:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <span>1. Understand the Problem</span>
                  <span>2. Form Hypotheses</span>
                  <span>3. Diagnostic Steps</span>
                  <span>4. Root Cause Reasoning</span>
                  <span>5. Proposed Fix</span>
                  <span>6. Regression Testing</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSetupModal('bug_fixing');
              }}
              className="w-full py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <span>Setup Bug-Fixing Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Practice Sessions */}
      <div className="bg-slate-900 border border-slate-700 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Recent Practice Sessions
          </h3>
          <span className="text-xs text-slate-400">Last attempts</span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-750">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Track</th>
                  <th className="py-2.5 px-3">Difficulty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Content Score</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{s.track_name}</td>
                    <td className="py-3 px-3 capitalize text-slate-300">{s.difficulty}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 ${
                          s.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {s.content_score != null ? `${s.content_score}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.status === 'completed' && (
                        <button
                          onClick={() => onViewReportById(s.id)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] uppercase tracking-wider"
                        >
                          View Report →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No completed sessions recorded yet. Click "Start Practice Interview" to launch your first session.
          </div>
        )}
      </div>
    </div>
  );
};
