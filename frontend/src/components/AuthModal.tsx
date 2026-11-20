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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 font-sans">
      <div className="bg-white border border-stone-200 rounded-none w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-stone-900 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">{currentUser.display_name}</h3>
                <p className="text-xs text-stone-500 font-semibold">{currentUser.email}</p>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 p-4 rounded-none text-xs space-y-3 text-stone-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-600">Account Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-none uppercase tracking-wider text-[10px]">
                  {currentUser.account_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-600">Audio Consent:</span>
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
                  className={`text-[11px] px-2.5 py-1 rounded-none border font-bold uppercase tracking-wider transition-colors ${
                    currentUser.consent_recording
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {currentUser.consent_recording ? 'Granted (Click to Revoke)' : 'Revoked (Click to Grant)'}
                </button>
              </div>
            </div>

            {/* Privacy & Recording Retention Controls */}
            <div className="border-t border-stone-200 pt-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
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
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-1.5"
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
                className="w-full py-1.5 text-rose-600 hover:text-rose-800 text-xs font-semibold transition-colors text-center"
              >
                Permanently Delete Account
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                {isRegister ? 'Create Candidate Account' : 'Candidate Sign In'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Access your personalized interview history, reports, and progress tracking.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-white border border-stone-300 rounded-none pl-9 pr-3 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full bg-white border border-stone-300 rounded-none pl-9 pr-3 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-stone-300 rounded-none pl-9 pr-3 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-orange-500 outline-none"
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
                    className="mt-0.5 rounded-none border-stone-300 text-orange-600 focus:ring-0"
                  />
                  <label htmlFor="consent" className="text-xs text-stone-600 leading-snug">
                    I consent to voice audio recording and automated AI speech analysis for assessment coaching.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs"
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

            <div className="pt-4 border-t border-stone-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Shield className="w-4 h-4 text-orange-600" />
                <span>Instant Sign In (Demo Account)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-orange-600 hover:underline text-center font-bold pt-1"
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
