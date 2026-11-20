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
  onOpenExaminerDemo?: () => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({ onLoginSuccess, onOpenExaminerDemo }) => {
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
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-12 font-sans space-y-10 min-h-[85vh] flex flex-col justify-center">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider rounded-none shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PRISM Multimodal Assessment Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
          Select Your Portal to Continue
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
          Access the candidate mock interview practice workspace or the enterprise recruiter assessment and scorecard suite.
        </p>
      </div>

      {error && (
        <div className="max-w-xl mx-auto w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-none flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Examiner Viva Showcase Gateway */}
      {onOpenExaminerDemo && (
        <div className="max-w-5xl mx-auto w-full bg-stone-900 border border-orange-500/40 rounded-none p-6 sm:p-8 shadow-md text-white flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-none bg-orange-600/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  For Evaluators, Professors & Invigilators:
                </span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-none bg-orange-500/20 text-orange-300 border border-orange-400/40 uppercase">
                  Viva Mode
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
                Inspect side-by-side flawed vs exemplar candidate answers, live audio playback in realistic AI voice, and test your mic live in 60 seconds without login.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenExaminerDemo}
            className="px-6 py-3.5 rounded-none bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all shrink-0 flex items-center gap-2"
          >
            <span>Launch Examiner Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two Differentiated Portal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {/* =========================================================================
            PORTAL 1: CANDIDATE PORTAL
           ========================================================================= */}
        <div className="bg-white rounded-none border border-stone-200 shadow-xs hover:border-orange-400 hover:shadow-sm transition-all p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-none bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-none">
                Candidate Workspace
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
                Candidate Practice & Mock Studio
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Ingest your Resume PDF, defend your code architecture against Tree-Sitter AST questions, and receive anti-cheat feedback with AI-voiced exemplars.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2 text-xs text-stone-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Resume PDF Ingestion & Project Claims Extraction</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Tree-Sitter AST & pgvector Anti-Cheat Probing</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>AI-Voiced Exemplar Defense (~140 WPM Pacing)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Skill Mastery & Practice Session Tracking</span>
              </div>
            </div>
          </div>

          {/* Quick Dummy Sign-in Buttons */}
          <div className="space-y-3 pt-6 border-t border-stone-200 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              1-Click Candidate Dummy Logins:
            </span>

            <button
              onClick={() => handleQuickLogin('candidate@ai-interview.com', 'candidate')}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-none transition-all shadow-xs flex items-center justify-between group/btn disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4" />
                <span>Sign In as Alex Chen (Senior Candidate)</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleQuickLogin('demo@ai-interview.com', 'candidate')}
              disabled={isLoading}
              className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Sign In as Demo Candidate</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PORTAL 2: RECRUITER & TALENT TEAM PORTAL
           ========================================================================= */}
        <div className="bg-white rounded-none border border-stone-200 shadow-xs hover:border-orange-400 hover:shadow-sm transition-all p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-none bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center shadow-xs">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <span className="bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-none">
                Company & Recruiter Suite
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
                Recruiter & Talent Assessment Suite
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Draft job rubrics from JDs, inspect multimodal candidate scorecards with question-by-question metrics, and resolve review queue disputes.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2 text-xs text-stone-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Job Description → LLM Rubric Drafter & Candidate Invites</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Per-Question Multimodal Metric Deep Dive (Text, Voice, Video)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Review Queue & Candidate Contestation Resolution</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Algorithmic Model Calibration & Fairness Auditing (ICC, ECE)</span>
              </div>
            </div>
          </div>

          {/* Quick Dummy Sign-in Buttons */}
          <div className="space-y-3 pt-6 border-t border-stone-200 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              1-Click Recruiter Dummy Logins:
            </span>

            <button
              onClick={() => handleQuickLogin('recruiter@ai-interview.com', 'recruiter')}
              disabled={isLoading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-none transition-all shadow-xs flex items-center justify-between group/btn disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-orange-400" />
                <span>Sign In as Sarah Jenkins (Lead Recruiter)</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('reviewer@ai-interview.com', 'reviewer')}
                disabled={isLoading}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-none transition-all truncate text-center disabled:opacity-50"
              >
                <span>Dr. Marcus (Reviewer)</span>
              </button>
              <button
                onClick={() => handleQuickLogin('admin@ai-interview.com', 'admin')}
                disabled={isLoading}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-none transition-all truncate text-center disabled:opacity-50"
              >
                <span>System Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Manual Login Drawer Toggle */}
      <div className="text-center mt-6">
        <button
          onClick={() => setShowCustomLogin(!showCustomLogin)}
          className="text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-orange-600 inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Or sign in with custom credentials</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomLogin ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Custom Login Form (Collapsible) */}
      {showCustomLogin && (
        <div className="max-w-md mx-auto w-full bg-white border border-stone-200 rounded-none p-8 shadow-sm animate-in fade-in duration-200 space-y-5">
          <div className="flex border-b border-stone-200 pb-3 gap-6 justify-center text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('candidate')}
              className={`pb-1 ${activeTab === 'candidate' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-stone-400'}`}
            >
              Candidate Login
            </button>
            <button
              onClick={() => setActiveTab('recruiter')}
              className={`pb-1 ${activeTab === 'recruiter' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-stone-400'}`}
            >
              Recruiter Login
            </button>
          </div>

          <form onSubmit={handleCustomSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-none p-3 outline-none focus:border-orange-500"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-none p-3 outline-none focus:border-orange-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-none p-3 outline-none focus:border-orange-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-none transition-all shadow-xs mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
              ) : isRegistering ? (
                'Create Account & Enter'
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-orange-600 hover:underline font-semibold"
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
