import React from 'react';
import { Activity, Brain, LayoutDashboard, FileText, Cpu, TrendingUp, Radio, User as UserIcon, Shield } from 'lucide-react';
import { HealthResponse, User } from '../types';

interface NavbarProps {
  currentPage: 'dashboard' | 'live_interview' | 'session_report' | 'progress' | 'insights';
  onNavigate: (page: 'dashboard' | 'live_interview' | 'session_report' | 'progress' | 'insights') => void;
  health: HealthResponse | null;
  hasActiveSession: boolean;
  hasActiveReport: boolean;
  currentUser: User | null;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  health,
  hasActiveSession,
  hasActiveReport,
  currentUser,
  onOpenAuthModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 bg-cyan-600 flex items-center justify-center text-white shadow-sm">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight uppercase">
                AI Interview Coach
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800">
                PRD 1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Multimodal Assessment Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors border ${
              currentPage === 'dashboard'
                ? 'bg-slate-800 text-cyan-300 border-cyan-600'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('live_interview')}
            disabled={!hasActiveSession}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors border ${
              currentPage === 'live_interview'
                ? 'bg-slate-800 text-cyan-300 border-cyan-600'
                : hasActiveSession
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                : 'text-slate-600 cursor-not-allowed opacity-40 border-transparent'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Live Interview</span>
          </button>

          <button
            onClick={() => onNavigate('session_report')}
            disabled={!hasActiveReport}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors border ${
              currentPage === 'session_report'
                ? 'bg-slate-800 text-cyan-300 border-cyan-600'
                : hasActiveReport
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                : 'text-slate-600 cursor-not-allowed opacity-40 border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Report</span>
          </button>

          <button
            onClick={() => onNavigate('progress')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors border ${
              currentPage === 'progress'
                ? 'bg-slate-800 text-cyan-300 border-cyan-600'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Progress</span>
          </button>

          <button
            onClick={() => onNavigate('insights')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors border ${
              currentPage === 'insights'
                ? 'bg-slate-800 text-cyan-300 border-cyan-600'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Insights</span>
          </button>
        </nav>

        {/* User Account & Health Badge */}
        <div className="flex items-center gap-3">
          {health && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-850 border border-slate-750 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>S-BERT & Whisper Ready</span>
            </div>
          )}

          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[100px] truncate hidden sm:inline">
              {currentUser ? currentUser.display_name : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
