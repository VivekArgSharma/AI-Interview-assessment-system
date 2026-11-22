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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-none border border-stone-200 shadow-xl max-w-xl w-full p-6 sm:p-8 animate-in fade-in duration-200">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Pre-Flight & Privacy Consent</h2>
            <p className="text-xs text-stone-500 font-semibold">{roleTitle}</p>
          </div>
        </div>

        <div className="text-xs text-stone-600 space-y-4 mb-6">
          <p className="bg-stone-50 border border-stone-200 p-3.5 rounded-none leading-relaxed">
            PRISM adheres strictly to <strong>Privacy-by-Default (PRD Section 1.5 & Section 15)</strong>.
            Raw audio recordings are permanently purged after 24 hours. Video presence and eye contact are evaluated
            with active 15% multimodal score weighting using on-device computer vision; raw frames are never stored permanently.
          </p>

          {/* Audio Consent */}
          <div className="p-3.5 rounded-none border border-stone-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-orange-600">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-900 text-xs">Audio Recording & Feature Extraction</label>
                <input
                  type="checkbox"
                  checked={audioConsent}
                  onChange={(e) => setAudioConsent(e.target.checked)}
                  className="rounded-none text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Enables Whisper streaming speech-to-text and prosody delivery pacing metrics.
              </p>
            </div>
          </div>

          {/* Video Consent Toggle */}
          <div className="p-3.5 rounded-none border border-stone-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-stone-700">
              {videoConsent ? <Video className="w-4 h-4 text-emerald-600" /> : <VideoOff className="w-4 h-4 text-stone-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-stone-900 text-xs">Camera & Eye Contact Tracking</label>
                  <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-none bg-orange-50 text-orange-700 border border-orange-200 font-bold">
                    Active 15% Score Weight
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={videoConsent}
                  onChange={(e) => setVideoConsent(e.target.checked)}
                  className="rounded-none text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Tracks camera eye contact, off-screen gaze shifts, and composure stability in real-time.
              </p>
            </div>
          </div>

          {/* TTL Retention */}
          <div className="p-3.5 rounded-none border border-stone-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-stone-700">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-900 text-xs">Data Retention TTL</label>
                <select
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(Number(e.target.value))}
                  className="text-xs border border-stone-300 rounded-none px-2.5 py-1 bg-white focus:outline-hidden focus:border-orange-500 font-semibold"
                >
                  <option value={24}>24 Hours (Recommended)</option>
                  <option value={48}>48 Hours</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Raw audio/video is auto-deleted after this duration. Transcripts & scores remain for your dashboard.
              </p>
            </div>
          </div>

          {/* Accommodations */}
          <div className="p-3.5 rounded-none border border-stone-200 bg-white flex items-start gap-3">
            <div className="mt-0.5 text-stone-700">
              <Accessibility className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-900 text-xs">Accessibility & Extra-Time Mode</label>
                <input
                  type="checkbox"
                  checked={extraTime}
                  onChange={(e) => setExtraTime(e.target.checked)}
                  className="rounded-none text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Extends pause thresholds, provides text-only fallback option, and relaxes cadence budgets.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 rounded-none hover:bg-stone-100 transition-colors"
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider bg-orange-600 text-white hover:bg-orange-700 shadow-xs disabled:opacity-50 transition-all"
          >
            <span>Agree & Enter Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
