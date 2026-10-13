import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [consentRecording, setConsentRecording] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const res = await ApiService.register({
          email,
          password,
          display_name: displayName,
          consent_recording: consentRecording,
        });
        onUserChange(res.user);
        onClose();
      } else {
        const res = await ApiService.login({ email, password });
        onUserChange(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiService.login({
        email: 'demo@ai-interview.com',
        password: 'DemoPass123!',
      });
      onUserChange(res.user);
      onClose();
    } catch (err: any) {
      setError('Could not log in as demo user. Ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    onUserChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{currentUser.display_name}</h3>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3 mb-5 text-xs space-y-2.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Account Status:</span>
                <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
                  {currentUser.account_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audio Recording Consent:</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const updated = await ApiService.updateProfile({
                        consent_recording: !currentUser.consent_recording,
                      });
                      onUserChange(updated);
                    } catch (e: any) {
                      setError(e?.message || 'Failed to update consent.');
                    }
                  }}
                  className={`text-[11px] px-2 py-0.5 border font-semibold transition-colors ${
                    currentUser.consent_recording
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                      : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                  }`}
                >
                  {currentUser.consent_recording ? 'Consent Granted (Click to Revoke)' : 'Revoked (Click to Grant)'}
                </button>
              </div>
            </div>

            {/* Privacy & Recording Retention Controls */}
            <div className="border-t border-slate-800 pt-4 mb-5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Privacy & Data Retention
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const res = await fetch('/api/v1/users/me/recordings', {
                      method: 'DELETE',
                      headers: ApiService.getToken() ? { Authorization: `Bearer ${ApiService.getToken()}` } : {},
                    });
                    const data = await res.json();
                    alert(data?.message || 'Voice recordings deleted successfully.');
                  } catch (e: any) {
                    setError('Failed to delete voice recordings.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Delete All My Voice Recordings</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (currentUser.email === 'demo@ai-interview.com') {
                    alert('The default demo account cannot be deleted.');
                    return;
                  }
                  if (window.confirm('Are you sure you want to delete your account and all associated practice data?')) {
                    try {
                      await ApiService.deleteAccount();
                      onUserChange(null);
                      onClose();
                    } catch (e: any) {
                      setError(e?.message || 'Failed to delete account.');
                    }
                  }
                }}
                className="w-full py-1.5 text-rose-400 hover:text-rose-300 text-xs transition-colors text-center"
              >
                Permanently Delete Account
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/60 text-rose-200 text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isRegister ? 'Create Candidate Account' : 'Candidate Sign In'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Access your personalized interview history, reports, and progress tracking.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {isRegister && (
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentRecording}
                    onChange={(e) => setConsentRecording(e.target.checked)}
                    className="mt-0.5 rounded-none bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <label htmlFor="consent" className="text-[11px] text-slate-400 leading-snug">
                    I consent to voice audio recording and automated AI speech analysis for assessment coaching.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRegister ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant Sign In (Demo Account)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-slate-400 hover:text-cyan-400 text-center transition-colors"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
