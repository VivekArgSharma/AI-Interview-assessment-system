import React, { useState } from 'react';
import {
  Briefcase,
  GraduationCap,
  Code2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Link2,
  KeyRound,
  UserCheck,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { ApiService } from '../services/api';
import { User } from '../types';

interface PortalLoginPageProps {
  onLoginSuccess: (
    user: User,
    targetRole: 'candidate' | 'recruiter' | 'reviewer' | 'admin',
    targetTrack?: 'tech' | 'sales'
  ) => void;
  onStartCustomInterviewByCode?: (inviteCode: string) => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  onLoginSuccess,
  onStartCustomInterviewByCode,
}) => {
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Custom login collapsible drawer
  const [showCustomLogin, setShowCustomLogin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'candidate' | 'recruiter'>('candidate');

  const handleLaunchRole = async (
    role: 'candidate' | 'recruiter',
    track: 'tech' | 'sales'
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const targetEmail =
        role === 'candidate' ? 'candidate@ai-interview.com' : 'recruiter@ai-interview.com';
      const res = await ApiService.login({
        email: targetEmail,
        password: 'DemoPass123!',
      });
      onLoginSuccess(res.user, role, track);
    } catch (err: any) {
      console.warn('Backend login fallback:', err);
      const fallbackUser: User = {
        id: `dummy_${role}_1`,
        email: role === 'candidate' ? 'candidate@ai-interview.com' : 'recruiter@ai-interview.com',
        display_name:
          role === 'candidate' ? 'Alex Chen (Candidate)' : 'Sarah Jenkins (Lead Interviewer)',
        role: role,
        consent_recording: true,
        account_status: 'active',
        created_at: new Date().toISOString(),
      };
      onLoginSuccess(fallbackUser, role, track);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    if (onStartCustomInterviewByCode) {
      onStartCustomInterviewByCode(inviteCodeInput.trim());
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiService.login({ email, password });
      onLoginSuccess(res.user, activeTab);
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
          <span>Multimodal AI Interview Platform</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
          Select Your Role to Continue
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
          Choose whether you are an <strong>Interviewer</strong> creating assessments and setting questions with model answers,
          or a <strong>Candidate</strong> practicing or taking an assessment via invite link.
        </p>
      </div>

      {error && (
        <div className="max-w-xl mx-auto w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-none flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Primary Role Choices: Interviewer vs Candidate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {/* =========================================================================
            CHOICE 1: INTERVIEWER / EXAMINER
           ========================================================================= */}
        <div className="bg-white rounded-none border-2 border-stone-200 hover:border-orange-500 shadow-sm transition-all p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-none bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <Briefcase className="w-6 h-6 text-orange-400" />
              </div>
              <span className="bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-none">
                Interviewer / Examiner Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-orange-700 transition-colors">
                Interviewer & Examiner Studio
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Design custom interviews, set questions with model correct answers, generate candidate invite links, and review AI Sentence-BERT semantic evaluations.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs text-stone-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Author custom questions and ideal model answers</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Automated Sentence-BERT semantic similarity scoring</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Generate shareable candidate invite codes & links</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Track candidate submissions, WPM, and speech pacing</span>
              </div>
            </div>
          </div>

          {/* Action Track Buttons */}
          <div className="space-y-3 pt-6 border-t border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Choose Track to Author:
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLaunchRole('recruiter', 'tech')}
                disabled={isLoading}
                className="bg-stone-900 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                <Code2 className="w-4 h-4 text-orange-400" />
                <span>Tech Track</span>
              </button>

              <button
                onClick={() => handleLaunchRole('recruiter', 'sales')}
                disabled={isLoading}
                className="bg-stone-900 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span>Sales Track</span>
              </button>
            </div>

            <button
              onClick={() => handleLaunchRole('recruiter', 'tech')}
              disabled={isLoading}
              className="w-full bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-none transition-all flex items-center justify-between group/btn disabled:opacity-50"
            >
              <span>Enter Interviewer Studio (Sarah Jenkins)</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            CHOICE 2: CANDIDATE / APPLICANT
           ========================================================================= */}
        <div className="bg-white rounded-none border-2 border-stone-200 hover:border-orange-500 shadow-sm transition-all p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-none bg-orange-600 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-none">
                Candidate / Applicant Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-orange-700 transition-colors">
                Candidate Workspace & Practice Hub
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Take an assessment created by your interviewer via invite code/link, practice live interactive mock scenarios, and inspect AI speech coach feedback.
              </p>
            </div>

            {/* Quick Invite Code Ingestion Box */}
            <form onSubmit={handleInviteSubmit} className="p-4 bg-orange-50/50 border border-orange-200 rounded-none space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                <span>Have an Interview Link or Code?</span>
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="e.g. TECH-101 or paste link"
                  className="flex-1 bg-white border border-stone-300 text-xs px-3 py-2 rounded-none font-mono focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inviteCodeInput.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shrink-0 disabled:opacity-50"
                >
                  Start →
                </button>
              </div>
            </form>

            <div className="space-y-3 pt-1 text-xs text-stone-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Take custom interviewer assessments with live voice or text</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Side-by-side answer comparisons with model exemplar answers</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Hear exemplar delivery in realistic human AI voice (~140 WPM)</span>
              </div>
            </div>
          </div>

          {/* Action Track Buttons */}
          <div className="space-y-3 pt-6 border-t border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Choose Track to Practice:
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLaunchRole('candidate', 'tech')}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                <Code2 className="w-4 h-4 text-orange-200" />
                <span>Tech Track</span>
              </button>

              <button
                onClick={() => handleLaunchRole('candidate', 'sales')}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                <TrendingUp className="w-4 h-4 text-orange-200" />
                <span>Sales Track</span>
              </button>
            </div>

            <button
              onClick={() => handleLaunchRole('candidate', 'tech')}
              disabled={isLoading}
              className="w-full bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-none transition-all flex items-center justify-between group/btn disabled:opacity-50"
            >
              <span>Enter Candidate Practice Hub (Alex Chen)</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Manual Login Drawer Toggle */}
      <div className="text-center pt-2">
        <button
          onClick={() => setShowCustomLogin(!showCustomLogin)}
          className="text-xs text-stone-500 hover:text-orange-600 transition-colors inline-flex items-center gap-1.5 font-medium"
        >
          <span>Need custom email login? Click here</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomLogin ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showCustomLogin && (
        <form onSubmit={handleCustomSubmit} className="max-w-md mx-auto w-full bg-white p-6 border border-stone-300 rounded-none shadow-sm space-y-4">
          <div className="flex border-b border-stone-200 pb-2 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('candidate')}
              className={`text-xs font-bold uppercase pb-1 ${activeTab === 'candidate' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-stone-400'}`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recruiter')}
              className={`text-xs font-bold uppercase pb-1 ${activeTab === 'recruiter' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-stone-400'}`}
            >
              Interviewer
            </button>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full text-xs px-3 py-2 border border-stone-300 rounded-none focus:outline-none focus:border-orange-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full text-xs px-3 py-2 border border-stone-300 rounded-none focus:outline-none focus:border-orange-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-stone-900 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
          >
            Sign In
          </button>
        </form>
      )}
    </div>
  );
};
