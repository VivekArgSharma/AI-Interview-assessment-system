import React, { useState } from 'react';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  UserCheck,
  Building2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Cpu,
  Layers,
  ChevronDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { ApiService } from '../services/api';
import { User } from '../types';

interface PortalLoginPageProps {
  onLoginSuccess: (user: User, targetRole: 'candidate' | 'recruiter' | 'reviewer' | 'admin') => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'candidate' | 'recruiter'>('candidate');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Custom login state
  const [showCustomLogin, setShowCustomLogin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Quick 1-Click Sign-in Handler
  const handleQuickLogin = async (
    targetEmail: string,
    role: 'candidate' | 'recruiter' | 'reviewer' | 'admin'
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiService.login({
        email: targetEmail,
        password: 'DemoPass123!',
      });
      onLoginSuccess(res.user, role);
    } catch (err: any) {
      console.error('Quick login failed:', err);
      // Fallback dummy user if backend is offline or network fails
      const fallbackUser: User = {
        id: `dummy_${role}_1`,
        email: targetEmail,
        display_name:
          role === 'candidate'
            ? 'Alex Chen (Candidate)'
            : role === 'recruiter'
            ? 'Sarah Jenkins (Lead Recruiter)'
            : role === 'reviewer'
            ? 'Dr. Marcus Vance (Chief Reviewer)'
            : 'System Administrator',
        role: role,
        consent_recording: true,
        account_status: 'active',
        created_at: new Date().toISOString(),
      };
      onLoginSuccess(fallbackUser, role);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Form Login Handler
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        const res = await ApiService.register({
          email,
          password,
          display_name: displayName || email.split('@')[0],
          consent_recording: true,
        });
        onLoginSuccess(res.user, activeTab);
      } else {
        const res = await ApiService.login({ email, password });
        onLoginSuccess(res.user, activeTab);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 py-12 font-sans">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PRISM Multimodal Assessment Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Select Your Portal to Continue
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Access the candidate mock interview practice workspace or the enterprise recruiter assessment and scorecard suite.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Differentiated Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {/* =========================================================================
            PORTAL 1: CANDIDATE PORTAL
           ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-7 sm:p-9 flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-60" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Candidate Workspace
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Candidate Practice & Mock Studio
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ingest your Resume PDF, defend your code architecture against Tree-Sitter AST questions, and receive anti-cheat feedback with AI-voiced exemplars.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Resume PDF Ingestion & Project Claims Extraction</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tree-Sitter AST & pgvector Anti-Cheat Probing</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>AI-Voiced Exemplar Defense (~140 WPM Pacing)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Skill Mastery & Practice Session Tracking</span>
              </div>
            </div>
          </div>

          {/* Quick Dummy Sign-in Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              1-Click Candidate Dummy Logins:
            </span>

            <button
              onClick={() => handleQuickLogin('candidate@ai-interview.com', 'candidate')}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-between group/btn disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Sign In as Alex Chen (Senior Candidate)</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleQuickLogin('demo@ai-interview.com', 'candidate')}
              disabled={isLoading}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Sign In as Demo Candidate</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PORTAL 2: RECRUITER & TALENT TEAM PORTAL
           ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-7 sm:p-9 flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-60" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Company & Recruiter Suite
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Recruiter & Talent Assessment Suite
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Draft job rubrics from JDs, inspect multimodal candidate scorecards with question-by-question metrics, and resolve review queue disputes.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Job Description $\rightarrow$ LLM Rubric Drafter & Candidate Invites</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Per-Question Multimodal Metric Deep Dive (Text, Voice, Video)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Review Queue & Candidate Contestation Resolution</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Algorithmic Model Calibration & Fairness Auditing (ICC, ECE)</span>
              </div>
            </div>
          </div>

          {/* Quick Dummy Sign-in Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              1-Click Recruiter Dummy Logins:
            </span>

            <button
              onClick={() => handleQuickLogin('recruiter@ai-interview.com', 'recruiter')}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-between group/btn disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>Sign In as Sarah Jenkins (Lead Recruiter)</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickLogin('reviewer@ai-interview.com', 'reviewer')}
                disabled={isLoading}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs py-2 px-3 rounded-xl transition-all truncate text-center disabled:opacity-50"
              >
                <span>Dr. Marcus (Reviewer)</span>
              </button>
              <button
                onClick={() => handleQuickLogin('admin@ai-interview.com', 'admin')}
                disabled={isLoading}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs py-2 px-3 rounded-xl transition-all truncate text-center disabled:opacity-50"
              >
                <span>System Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Manual Login Drawer Toggle */}
      <div className="text-center mt-10">
        <button
          onClick={() => setShowCustomLogin(!showCustomLogin)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
        >
          <span>Or sign in with custom credentials</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomLogin ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Custom Login Form (Collapsible) */}
      {showCustomLogin && (
        <div className="max-w-md mx-auto mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in duration-200 space-y-4">
          <div className="flex border-b border-slate-100 pb-2 gap-4 justify-center text-xs font-bold">
            <button
              onClick={() => setActiveTab('candidate')}
              className={`pb-1 ${activeTab === 'candidate' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Candidate Login
            </button>
            <button
              onClick={() => setActiveTab('recruiter')}
              className={`pb-1 ${activeTab === 'recruiter' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Recruiter Login
            </button>
          </div>

          <form onSubmit={handleCustomSubmit} className="space-y-3">
            {isRegistering && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
              ) : isRegistering ? (
                'Create Account & Enter'
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
