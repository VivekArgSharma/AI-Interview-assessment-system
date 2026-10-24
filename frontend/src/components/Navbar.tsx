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
  Sparkles
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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate(activeRole === 'candidate' ? 'dashboard' : activeRole === 'recruiter' ? 'recruiter' : activeRole === 'reviewer' ? 'reviewer' : 'eval_dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight font-sans">
                PRISM
              </span>
              <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Multimodal AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">Explainable Assessment Platform</p>
          </div>
        </div>

        {/* Role Switcher Pill */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">Role:</span>
          {(['candidate', 'recruiter', 'reviewer', 'admin'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => {
                onSelectRole(role);
                if (role === 'candidate') onNavigate('dashboard');
                else if (role === 'recruiter') onNavigate('recruiter');
                else if (role === 'reviewer') onNavigate('reviewer');
                else if (role === 'admin') onNavigate('eval_dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                activeRole === role
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {role}
              {role === 'reviewer' && reviewQueueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                  {reviewQueueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Navigation Links according to Active Role */}
        <nav className="flex items-center gap-1">
          {activeRole === 'candidate' && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Practice & Tracks</span>
              </button>

              <button
                onClick={() => onNavigate('mock_practice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'mock_practice'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mock Inspection Studio</span>
              </button>

              <button
                onClick={() => onNavigate('live_interview')}
                disabled={!hasActiveSession}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'live_interview'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : hasActiveSession
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-500" />
                <span>Interview Room</span>
              </button>

              <button
                onClick={() => onNavigate('session_report')}
                disabled={!hasActiveReport}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'session_report'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : hasActiveReport
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Report</span>
              </button>

              <button
                onClick={() => onNavigate('progress')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'progress'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'recruiter'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Role Builder & Invites</span>
              </button>

              <button
                onClick={() => onNavigate('scorecard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'scorecard'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'reviewer'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Review Queue</span>
                {reviewQueueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'eval_dashboard'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Agreement & ICC</span>
              </button>

              <button
                onClick={() => onNavigate('admin_privacy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === 'admin_privacy'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Privacy & Audit</span>
              </button>
            </>
          )}

          {/* System status indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-3 ml-2 border-l border-slate-200">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Ready
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
};
