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
import { voiceEngine, DEFAULT_VOICES } from '../services/voiceEngine';

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
  const [voicePreference, setVoicePreference] = useState<string>('en-US-JennyNeural');
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
    voiceEngine.speak("Welcome to your interview. Let's begin your multimodal performance assessment.", {
      voice: voicePreference,
    });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-stone-200 rounded-none w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative text-stone-900 my-8 space-y-6">
        <button
          onClick={() => {
            stopMicTest();
            onClose();
          }}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-none">
              PRD Version 1.0 • Pre-Flight
            </span>
            <span className="text-xs text-stone-500">Multimodal Session Config</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Setup Interview Session</h2>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            Configure your interview track, duration, voice preferences, and verify your microphone.
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Track Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
              1. Choose Interview Track
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tracks.map((track) => {
                const isSelected = track.id === selectedTrackId;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`p-4 border cursor-pointer transition-all rounded-none ${
                      isSelected
                        ? 'bg-orange-50/50 border-orange-500 shadow-xs ring-1 ring-orange-500'
                        : 'bg-stone-50/50 border-stone-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-900">{track.name}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-none border border-stone-300" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed mb-2">
                      {track.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-semibold">
                      <Layers className="w-3.5 h-3.5 text-orange-600" />
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
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                2. Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-2 text-center text-xs font-bold uppercase tracking-wider rounded-none border transition-colors ${
                      difficulty === lvl
                        ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                3. Estimated Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2 px-2 text-center text-xs font-bold uppercase tracking-wider rounded-none border transition-colors flex items-center justify-center gap-1.5 ${
                      durationMinutes === mins
                        ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{mins}m</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Voice Preference */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                4. AI Interviewer Voice
              </label>
              <button
                type="button"
                onClick={playVoiceSample}
                className="text-xs font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Audio</span>
              </button>
            </div>
            <select
              value={voicePreference}
              onChange={(e) => setVoicePreference(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-none px-3.5 py-2.5 text-xs text-stone-800 focus:border-orange-500 outline-none font-semibold"
            >
              {DEFAULT_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} • {v.role}
                </option>
              ))}
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  [Client Local] {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Microphone Test & Consent */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-none space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Microphone Audio Test</span>
              </div>
              <button
                type="button"
                onClick={isTestingMic ? stopMicTest : startMicTest}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors ${
                  isTestingMic
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                    : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 shadow-xs'
                }`}
              >
                {isTestingMic ? 'Stop Test' : 'Check Mic'}
              </button>
            </div>

            {isTestingMic && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold mb-1">
                  <span>Input Volume Level:</span>
                  <span className={micVolume > 20 ? 'text-emerald-600 font-bold' : 'text-stone-500'}>
                    {micVolume > 10 ? 'Microphone Active' : 'Speak into mic...'}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 rounded-none overflow-hidden flex border border-stone-300">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-orange-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}

            {micError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            <div className="flex items-start gap-2.5 pt-2 border-t border-stone-200">
              <input
                type="checkbox"
                id="interviewConsent"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="mt-0.5 rounded-none border-stone-300 text-orange-600 focus:ring-0"
              />
              <label htmlFor="interviewConsent" className="text-xs text-stone-600 leading-relaxed">
                I understand this session evaluates spoken dialogue and that audio is processed to analyze speaking rate, pauses, and rubric criteria.
              </label>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!consentGranted || isLoading}
            onClick={handleStart}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 shadow-xs"
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
