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
  Radio,
  Code,
  Users,
  MessageSquare
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
  onQuickStartScenario?: (scenarioId: string, trackId: string) => void;
  onNavigateToMockStudio?: () => void;
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
  onQuickStartScenario,
  onNavigateToMockStudio,
}) => {
  const scenarioCards = [
    {
      id: 'S1',
      title: 'S1: Failing Service (Code Fix)',
      type: 'Technical',
      trackId: 'bug_fixing',
      desc: 'Investigate payment reconciliation accumulator duplication under network timeout retry storm. Fix Python worker and verify sandboxed tests.',
      icon: Bug,
      badge: 'Interactive Sandbox'
    },
    {
      id: 'S2',
      title: 'S2: Pull Request Review',
      type: 'Technical',
      trackId: 'bug_fixing',
      desc: 'Review seeded PR with planted SQL injection and resource leaks. Leave inline feedback and decide approve or request changes.',
      icon: Code,
      badge: 'Defect Recall'
    },
    {
      id: 'S3',
      title: 'S3: Incident with Teammates',
      type: 'Technical',
      trackId: 'bug_fixing',
      desc: 'Triage live production outage in real-time chat with simulated On-call lead (Alex), Product Manager (Sarah), and Junior engineer (Leo).',
      icon: Users,
      badge: 'Multi-Agent Sim'
    },
    {
      id: 'N1',
      title: 'N1: Angry Customer (Late Refund)',
      type: 'Non-Technical',
      trackId: 'sales',
      desc: 'Consultative de-escalation with Marcus Vance. Emotional patience meter tracking with hidden fact: wants personal apology more than money.',
      icon: MessageSquare,
      badge: 'Patience Meter'
    },
    {
      id: 'N2',
      title: 'N2: Hesitant Parent (Screen Time)',
      type: 'Non-Technical',
      trackId: 'sales',
      desc: 'Elena Rostova fears her 8-year-old son has excessive screen time. Address real objection with open-ended discovery instead of discounts.',
      icon: Users,
      badge: 'Discovery Probing'
    },
    {
      id: 'N3',
      title: 'N3: Difficult Colleague (Handoff)',
      type: 'Non-Technical',
      trackId: 'sales',
      desc: 'Jordan Chen is defensive about a missed sprint deadline. Discover uncommunicated timeline changes collaboratively without blame.',
      icon: Briefcase,
      badge: 'De-escalation'
    }
  ];

  return (
    <div className="space-y-8 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      {/* Hero Banner (White Mode UI) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              PRISM Assessment Platform
            </span>
            <span className="text-xs text-slate-500">Live Voice • Scenario Simulations • Separate Modalities</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Explainable Multimodal Interview Assessments
          </h1>

          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Practice live voice interviews scored by separate, calibrated models for text reasoning, acoustic voice delivery,
            and descriptive framing. Run realistic incident scenarios with simulated teammates or stakeholder roleplay.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onOpenSetupModal(selectedTrackId)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse text-rose-300" />
              <span>Launch Full Interview</span>
            </button>

            {onNavigateToMockStudio && (
              <button
                onClick={onNavigateToMockStudio}
                className="px-5 py-3 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Mock Inspection Studio (AI Voice & Deficits)</span>
              </button>
            )}

            {currentUser && (
              <span className="text-xs text-slate-500 pl-2">
                Candidate: <strong className="text-slate-900">{currentUser.display_name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Library Section (PRD Section 9) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Work Scenario & Stakeholder Library (PRD Section 9)</h2>
            <p className="text-xs text-slate-500">Beyond simple Q&A: realistic simulated work environments with code editors, tests, and persona agents.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarioCards.map((scen) => {
            const IconComponent = scen.icon;
            return (
              <div
                key={scen.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {scen.type}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {scen.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">{scen.title}</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{scen.desc}</p>
                </div>

                <button
                  onClick={() => {
                    if (onQuickStartScenario) {
                      onQuickStartScenario(scen.id, scen.trackId);
                    } else {
                      onOpenSetupModal(scen.trackId);
                    }
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Start {scen.id} Simulation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standard Curriculum Tracks */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Standard Interview Tracks</h2>
          <p className="text-xs text-slate-500">Multi-stage curriculum with automatic stage progression and adaptive probes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                selectedTrackId === track.id ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">{track.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {track.stages?.length || 5} Stages
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{track.description}</p>
              <button
                onClick={() => {
                  onSelectTrack(track.id);
                  onOpenSetupModal(track.id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <span>Select & Configure</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session History */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Practice History</h2>
            <span className="text-xs text-slate-400">{history.length} sessions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                <div>
                  <span className="font-bold text-slate-900 block">{item.track_name}</span>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {item.difficulty} • {item.duration_minutes}m • Status: {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {item.content_score != null && (
                    <span className="font-mono font-bold text-slate-800">
                      Score: {item.content_score > 5 ? (item.content_score / 20).toFixed(1) : item.content_score} / 5.0
                    </span>
                  )}
                  <button
                    onClick={() => onViewReportById(item.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
