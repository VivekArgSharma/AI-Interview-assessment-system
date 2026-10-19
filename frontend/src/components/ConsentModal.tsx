import React, { useState } from 'react';
import { ShieldCheck, Mic, Video, VideoOff, Clock, Accessibility, AlertTriangle, ArrowRight } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmConsent: (consentData: {
    audio_consent: boolean;
    video_consent: boolean;
    retention_ttl_hours: number;
    extra_time_accommodations: boolean;
  }) => void;
  roleTitle?: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirmConsent,
  roleTitle = 'Standard Interview Session'
}) => {
  const [audioConsent, setAudioConsent] = useState(true);
  const [videoConsent, setVideoConsent] = useState(true);
  const [retentionHours, setRetentionHours] = useState(24);
  const [extraTime, setExtraTime] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 sm:p-8 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">Pre-Flight & Privacy Consent</h2>
            <p className="text-xs text-slate-500">{roleTitle}</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-4 mb-6">
          <p className="bg-slate-50 border border-slate-200 p-3 rounded-xl leading-relaxed">
            PRISM adheres strictly to <strong>Privacy-by-Default (PRD Section 1.5 & Section 15)</strong>.
            Raw audio recordings are permanently purged after 24 hours. Video is purely descriptive, optional,
            and never used for subjective inferences of confidence or personality.
          </p>

          {/* Audio Consent */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-indigo-600">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-900 text-xs">Audio Recording & Feature Extraction</label>
                <input
                  type="checkbox"
                  checked={audioConsent}
                  onChange={(e) => setAudioConsent(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enables Whisper streaming speech-to-text and prosody delivery pacing metrics.
              </p>
            </div>
          </div>

          {/* Video Consent Toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-slate-700">
              {videoConsent ? <Video className="w-4 h-4 text-emerald-600" /> : <VideoOff className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-slate-900 text-xs">Camera & Framing Observables (Optional)</label>
                  <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Default Weight: 0.0
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={videoConsent}
                  onChange={(e) => setVideoConsent(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Extracts descriptive framing centering only. Frames are processed on-device and never stored permanently.
              </p>
            </div>
          </div>

          {/* TTL Retention */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-slate-700">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-900 text-xs">Data Retention TTL</label>
                <select
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={24}>24 Hours (Recommended)</option>
                  <option value={48}>48 Hours</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Raw audio/video is auto-deleted after this duration. Transcripts & scores remain for your dashboard.
              </p>
            </div>
          </div>

          {/* Accommodations */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-slate-700">
              <Accessibility className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-900 text-xs">Accessibility & Extra-Time Mode</label>
                <input
                  type="checkbox"
                  checked={extraTime}
                  onChange={(e) => setExtraTime(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Extends pause thresholds, provides text-only fallback option, and relaxes cadence budgets.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmConsent({
              audio_consent: audioConsent,
              video_consent: videoConsent,
              retention_ttl_hours: retentionHours,
              extra_time_accommodations: extraTime
            })}
            disabled={!audioConsent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50 transition-all"
          >
            <span>Agree & Enter Interview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
