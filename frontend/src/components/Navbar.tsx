import React from 'react';
import {
  Brain,
  LayoutDashboard,
  Radio,
  FileText,
  TrendingUp,
  Briefcase,
  ShieldAlert,
  BarChart3,
  Lock,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeftRight,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { HealthResponse, User } from '../types';

export type UserRole = 'candidate' | 'recruiter' | 'reviewer' | 'admin';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  health: HealthResponse | null;
  hasActiveSession: boolean;
  hasActiveReport: boolean;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  reviewQueueCount: number;
  currentUser?: User | null;
  onSwitchPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  health,
  hasActiveSession,
  hasActiveReport,
  activeRole,
  onSelectRole,
  reviewQueueCount,
  currentUser,
  onSwitchPortal,
}) => {

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-orange-600 shadow-xs">
      <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate(activeRole === 'candidate' ? 'dashboard' : activeRole === 'recruiter' ? 'recruiter' : activeRole === 'reviewer' ? 'reviewer' : 'eval_dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-none bg-orange-600 flex items-center justify-center text-white shadow-xs group-hover:bg-orange-700 transition-colors">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-zinc-900 text-base tracking-tight font-sans">
                PRISM
              </span>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-none bg-orange-50 text-orange-700 border border-orange-200">
                AI INTERVIEW
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 hidden sm:block uppercase tracking-wider font-mono">Multimodal Evaluation Platform</p>
          </div>
        </div>

        {/* Active Portal Badge (Differentiated Candidate vs Recruiter) */}
        {currentPage !== 'portal_login' ? (
          <div className="hidden md:flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-none text-xs font-bold border ${
                activeRole === 'candidate'
                  ? 'bg-orange-50 text-orange-800 border-orange-300'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-none ${
                  activeRole === 'candidate' ? 'bg-orange-600' : 'bg-zinc-700'
                }`}
              />
              <span>
                {activeRole === 'candidate'
                  ? 'Candidate Portal'
                  : activeRole === 'recruiter'
                  ? 'Recruiter Portal'
                  : activeRole === 'reviewer'
                  ? 'Reviewer Portal'
                  : 'Admin Portal'}
              </span>
              <span className="text-zinc-400 font-normal">|</span>
              <span className="font-semibold text-zinc-800">
                {currentUser?.display_name ||
                  (activeRole === 'candidate' ? 'Alex Chen' : 'Sarah Jenkins')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 bg-orange-50 px-3 py-1 rounded-none border border-orange-200">
              PRISM Gateway • Select Portal
            </span>
          </div>
        )}

        {/* Navigation Links according to Active Role */}
        {currentPage !== 'portal_login' && (
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('examiner_demo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-bold transition-all mr-2 ${
                currentPage === 'examiner_demo'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-orange-600" />
              <span>Examiner Demo</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-none bg-orange-200 text-orange-950 font-extrabold uppercase">
                Viva
              </span>
            </button>

            {activeRole === 'candidate' && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'dashboard'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Practice & Tracks</span>
              </button>

              <button
                onClick={() => onNavigate('mock_practice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'mock_practice'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Mock Inspection Studio</span>
              </button>

              <button
                onClick={() => onNavigate('live_interview')}
                disabled={!hasActiveSession}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'live_interview'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : hasActiveSession
                    ? 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                    : 'text-zinc-400 cursor-not-allowed opacity-50 border-transparent'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-orange-600" />
                <span>Interview Room</span>
              </button>

              <button
                onClick={() => onNavigate('session_report')}
                disabled={!hasActiveReport}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'session_report'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : hasActiveReport
                    ? 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                    : 'text-zinc-400 cursor-not-allowed opacity-50 border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Report</span>
              </button>

              <button
                onClick={() => onNavigate('progress')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'progress'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Progress</span>
              </button>
            </>
          )}

          {activeRole === 'recruiter' && (
            <>
              <button
                onClick={() => onNavigate('recruiter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'recruiter'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Role Builder & Invites</span>
              </button>

              <button
                onClick={() => onNavigate('scorecard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'scorecard'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Recruiter Scorecard</span>
              </button>
            </>
          )}

          {activeRole === 'reviewer' && (
            <>
              <button
                onClick={() => onNavigate('reviewer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'reviewer'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
                <span>Review Queue</span>
                {reviewQueueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-none text-[10px] bg-orange-100 text-orange-800 font-bold border border-orange-300">
                    {reviewQueueCount}
                  </span>
                )}
              </button>
            </>
          )}

          {activeRole === 'admin' && (
            <>
              <button
                onClick={() => onNavigate('eval_dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'eval_dashboard'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Agreement & ICC</span>
              </button>

              <button
                onClick={() => onNavigate('admin_privacy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${
                  currentPage === 'admin_privacy'
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-orange-50/60 border-transparent'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Privacy & Audit</span>
              </button>
            </>
          )}

          {/* System status & Switch Portal Button */}
          <div className="flex items-center gap-2 pl-3 ml-2 border-l border-zinc-200">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 mr-1 font-mono">
              <span className="w-2 h-2 rounded-none bg-orange-500 animate-pulse" />
              API Ready
            </span>

            {onSwitchPortal && (
              <button
                onClick={onSwitchPortal}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:text-orange-600 hover:bg-orange-50 border border-zinc-200 rounded-none transition-colors"
                title="Switch Portal Gateway"
              >
                <ArrowLeftRight className="w-3 h-3 text-orange-600" />
                <span className="hidden sm:inline">Switch Portal</span>
              </button>
            )}
          </div>
        </nav>
        )}
      </div>
    </header>
  );
};
