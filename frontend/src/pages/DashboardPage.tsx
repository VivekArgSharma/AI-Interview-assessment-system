import React, { useState } from 'react';
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
  MessageSquare,
  Link2,
  KeyRound,
  Loader2,
  AlertCircle
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
  onNavigateToMyInterviews?: () => void;
  onStartCustomInterviewByCode?: (inviteCode: string) => void;
  onSwitchToInterviewer?: () => void;
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
  onNavigateToMyInterviews,
  onStartCustomInterviewByCode,
  onSwitchToInterviewer,
}) => {
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');
  const [isVerifyingInvite, setIsVerifyingInvite] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeFilterTrack, setActiveFilterTrack] = useState<'all' | 'bug_fixing' | 'sales'>('all');

  const handleLaunchInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setInviteError(null);
    if (onStartCustomInterviewByCode) {
      onStartCustomInterviewByCode(inviteCodeInput.trim());
    }
  };
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
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-10 space-y-10 font-sans">
      {/* Prominent Invite Link Entry Card */}
      <div className="bg-stone-900 text-white rounded-none p-6 sm:p-8 border border-orange-500/40 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-orange-500/20 text-orange-300 border border-orange-400/30 font-mono">
                Candidate Invite Gateway
              </span>
              <span className="text-xs text-stone-400">Custom interviewer assessments</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Have an Interview Link or Code from your Interviewer?
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Enter your code (e.g. <span className="font-mono text-orange-400 font-bold">TECH-101</span> or <span className="font-mono text-orange-400 font-bold">SALES-202</span>) or paste the complete invite link. You will be assessed on the questions and model answers set by your interviewer.
            </p>
          </div>

          <form onSubmit={handleLaunchInvite} className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-80">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g. TECH-101 or paste link"
                className="w-full bg-stone-800 border border-stone-700 text-white text-xs pl-10 pr-4 py-3 rounded-none focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!inviteCodeInput.trim() || isVerifyingInvite}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Hero Banner (Orange & White UI) */}
      <div className="bg-white border border-stone-200 rounded-none p-8 sm:p-12 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-50 rounded-none -z-0 opacity-70 translate-x-12 -translate-y-12" />
        <div className="max-w-4xl relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-none">
              Candidate Practice Workspace
            </span>
            <span className="text-xs text-stone-500 font-medium">Interactive AI Mock Interviews & Practice Scenarios</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Explainable Multimodal Interview Assessments
          </h1>

          <p className="text-sm sm:text-base text-stone-600 mt-4 leading-relaxed max-w-3xl">
            Practice live voice interviews scored by separate, calibrated models for text reasoning, acoustic voice delivery,
            and descriptive framing. Run realistic incident scenarios with simulated teammates or stakeholder roleplay.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <button
              onClick={() => onOpenSetupModal(selectedTrackId)}
              className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-all flex items-center gap-2.5"
            >
              <Radio className="w-4 h-4 animate-pulse text-orange-200" />
              <span>Launch Full Interview</span>
            </button>

            {onNavigateToMyInterviews && (
              <button
                onClick={onNavigateToMyInterviews}
                className="px-6 py-3.5 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-all flex items-center gap-2.5"
              >
                <Award className="w-4 h-4 text-orange-600" />
                <span>My Interviews & Better Answers</span>
              </button>
            )}

            {onSwitchToInterviewer && (
              <button
                onClick={onSwitchToInterviewer}
                className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-none border border-stone-300 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-stone-600" />
                <span>Switch to Interviewer Studio</span>
              </button>
            )}

            {currentUser && (
              <div className="flex items-center gap-2 text-xs text-stone-500 pl-2">
                <span className="w-2 h-2 rounded-none bg-emerald-500" />
                <span>Candidate: <strong className="text-stone-900 font-semibold">{currentUser.display_name}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Library Section (PRD Section 9) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-stone-900">
              Work Scenario & Stakeholder Library
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Practice specialized interactive scenarios: code fixes, architecture trade-offs, and client de-escalation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilterTrack('all')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-none transition-all border ${
                activeFilterTrack === 'all'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-orange-500'
              }`}
            >
              All (6)
            </button>
            <button
              onClick={() => setActiveFilterTrack('bug_fixing')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-none transition-all border ${
                activeFilterTrack === 'bug_fixing'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-orange-500'
              }`}
            >
              Tech Track (3)
            </button>
            <button
              onClick={() => setActiveFilterTrack('sales')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-none transition-all border ${
                activeFilterTrack === 'sales'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-orange-500'
              }`}
            >
              Sales Track (3)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarioCards
            .filter((scen) => activeFilterTrack === 'all' || scen.trackId === activeFilterTrack)
            .map((scen) => {
            const IconComponent = scen.icon;
            return (
              <div
                key={scen.id}
                className="bg-white border border-stone-200 rounded-none p-6 shadow-xs hover:border-orange-400 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-none bg-stone-100 text-stone-700 border border-stone-200">
                      {scen.type}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-1 rounded-none border border-orange-200">
                      {scen.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-900">{scen.title}</h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed mb-6">{scen.desc}</p>
                </div>

                <button
                  onClick={() => {
                    if (onQuickStartScenario) {
                      onQuickStartScenario(scen.id, scen.trackId);
                    } else {
                      onOpenSetupModal(scen.trackId);
                    }
                  }}
                  className="w-full py-2.5 bg-stone-50 hover:bg-orange-600 text-stone-700 hover:text-white border border-stone-200 hover:border-orange-600 rounded-none text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-xs"
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-stone-900">Standard Interview Tracks</h2>
            <p className="text-xs text-stone-500 mt-0.5">Multi-stage curriculum with automatic stage progression and adaptive probes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`bg-white border rounded-none p-6 shadow-xs transition-all ${
                selectedTrackId === track.id ? 'border-orange-500 ring-2 ring-orange-100' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-stone-900 text-base">{track.name}</span>
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-none bg-stone-100 text-stone-600 border border-stone-200">
                  {track.stages?.length || 5} Stages
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">{track.description}</p>
              <button
                onClick={() => {
                  onSelectTrack(track.id);
                  onOpenSetupModal(track.id);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-none text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
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
        <div className="bg-white border border-stone-200 rounded-none shadow-xs overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Recent Practice History</h2>
              <p className="text-xs text-stone-500 mt-0.5">Quick access to past interview evaluation transcripts</p>
            </div>
            <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-3 py-1 border border-stone-200 rounded-none">
              {history.length} sessions
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-orange-50/20 transition-colors">
                <div>
                  <span className="font-bold text-stone-900 text-sm block">{item.track_name}</span>
                  <span className="text-[11px] text-stone-500 capitalize">
                    {item.difficulty} • {item.duration_minutes}m • Status: {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {item.content_score != null && (
                    <span className="font-mono font-bold text-stone-800 text-sm">
                      Score: {item.content_score > 5 ? (item.content_score / 20).toFixed(1) : item.content_score} / 5.0
                    </span>
                  )}
                  <button
                    onClick={() => onViewReportById(item.id)}
                    className="px-4 py-2 rounded-none border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold uppercase text-[11px] tracking-wider transition-colors shadow-xs"
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
