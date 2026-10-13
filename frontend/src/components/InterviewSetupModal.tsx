import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  Clock,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio
} from 'lucide-react';
import { InterviewTrack, StageInfo } from '../types';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: InterviewTrack[];
  initialTrackId?: string;
  onStartSession: (config: {
    trackId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    durationMinutes: number;
    voicePreference: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const InterviewSetupModal: React.FC<InterviewSetupModalProps> = ({
  isOpen,
  onClose,
  tracks,
  initialTrackId = 'sales',
  onStartSession,
  isLoading,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(initialTrackId);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [voicePreference, setVoicePreference] = useState<string>('default');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [consentGranted, setConsentGranted] = useState<boolean>(true);

  // Mic test state
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTrackId) {
      setSelectedTrackId(initialTrackId);
    }
  }, [initialTrackId]);

  // Load available speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices.filter((v) => v.lang.startsWith('en')));
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      stopMicTest();
    };
  }, []);

  const startMicTest = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsTestingMic(true);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err: any) {
      setMicError('Microphone permission denied or microphone unavailable. Please check browser permissions.');
      setIsTestingMic(false);
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setMicVolume(0);
  };

  const playVoiceSample = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Welcome to your interview. Let's begin the evaluation.");
      const voice = availableVoices.find((v) => v.name === voicePreference);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStart = async () => {
    stopMicTest();
    await onStartSession({
      trackId: selectedTrackId,
      difficulty,
      durationMinutes,
      voicePreference,
    });
  };

  if (!isOpen) return null;

  const currentTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl p-6 shadow-2xl relative text-slate-100 my-8">
        <button
          onClick={() => {
            stopMicTest();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800">
              PRD Version 1.0
            </span>
            <span className="text-xs text-slate-400">Pre-Interview Configuration</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Setup Interview Session</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure your interview track, duration, voice preferences, and verify your microphone.
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Track Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              1. Choose Interview Track
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tracks.map((track) => {
                const isSelected = track.id === selectedTrackId;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`p-3.5 border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-850 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{track.name}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {track.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>{track.stages?.length || 5} Conversational Stages</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Difficulty & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                2. Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-2 text-center text-xs font-semibold capitalize border transition-colors ${
                      difficulty === lvl
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                3. Estimated Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2 px-2 text-center text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      durationMinutes === mins
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{mins}m</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Voice Preference */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                4. AI Interviewer Voice
              </label>
              <button
                type="button"
                onClick={playVoiceSample}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Audio</span>
              </button>
            </div>
            <select
              value={voicePreference}
              onChange={(e) => setVoicePreference(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-hidden"
            >
              <option value="default">Default System Voice</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Microphone Test & Consent */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Microphone Audio Test</span>
              </div>
              <button
                type="button"
                onClick={isTestingMic ? stopMicTest : startMicTest}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                  isTestingMic
                    ? 'bg-rose-900/60 border-rose-700 text-rose-200'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {isTestingMic ? 'Stop Test' : 'Check Mic'}
              </button>
            </div>

            {isTestingMic && (
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Input Volume Level:</span>
                  <span className={micVolume > 20 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {micVolume > 10 ? 'Microphone Active' : 'Speak into mic...'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-none overflow-hidden flex">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}

            {micError && (
              <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            <div className="flex items-start gap-2 pt-1 border-t border-slate-800/80">
              <input
                type="checkbox"
                id="interviewConsent"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="mt-0.5 rounded-none bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
              />
              <label htmlFor="interviewConsent" className="text-[11px] text-slate-400 leading-snug">
                I understand this session evaluates spoken dialogue and that audio is processed to analyze speaking rate, pauses, and rubric criteria.
              </label>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!consentGranted || isLoading}
            onClick={handleStart}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Session...</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Begin Spoken Interview</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
