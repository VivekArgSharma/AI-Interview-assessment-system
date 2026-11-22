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
  Radio,
  Video,
  VideoOff,
  Eye,
  EyeOff,
  Camera,
  ShieldCheck
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
    videoEnabled?: boolean;
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

  // AV Hardware Pre-Flight State
  const [isMediaActive, setIsMediaActive] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
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
  }, []);

  // Automatically start camera & mic check when modal is open
  useEffect(() => {
    if (isOpen) {
      startMediaCheck();
    } else {
      stopMediaCheck();
    }
    return () => {
      stopMediaCheck();
    };
  }, [isOpen]);

  const startMediaCheck = async () => {
    try {
      setMicError(null);
      setCameraError(null);

      // Request both Camera and Microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
        audio: true
      });
      combinedStreamRef.current = stream;
      setIsMediaActive(true);
      setIsCameraActive(true);

      // Connect video stream to preview
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }

      // Initialize Web Audio analyser for real-time mic volume tracking
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

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
      console.warn('Combined camera/mic check warning:', err);
      // Fallback: try audio-only to identify if only camera was denied
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        combinedStreamRef.current = audioStream;
        setIsMediaActive(true);
        setIsCameraActive(false);
        setCameraError('Camera access not granted. Click "Allow Camera" to enable 15% eye contact scoring.');

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (audioErr) {
        setMicError('Microphone permission denied. Spoken interviews require microphone access.');
        setCameraError('Camera permission not granted. Please allow camera in your browser.');
        setIsMediaActive(false);
        setIsCameraActive(false);
      }
    }
  };

  const stopMediaCheck = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((t) => t.stop());
      combinedStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsMediaActive(false);
    setIsCameraActive(false);
    setMicVolume(0);
  };

  const playVoiceSample = () => {
    voiceEngine.speak("Welcome to your interview. Let's begin your multimodal performance assessment.", {
      voice: voicePreference,
    });
  };

  const handleStart = async () => {
    stopMediaCheck();
    await onStartSession({
      trackId: selectedTrackId,
      difficulty,
      durationMinutes,
      voicePreference,
      videoEnabled,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-stone-200 rounded-none w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative text-stone-900 my-8 space-y-6">
        <button
          onClick={() => {
            stopMediaCheck();
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

          {/* 4. Camera & Microphone Hardware Pre-Flight Check */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-none space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Camera & Microphone Pre-Flight Check
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-orange-100 text-orange-800 border border-orange-200">
                  Active 15% Video Weight
                </span>
              </div>
              <button
                type="button"
                onClick={isMediaActive ? stopMediaCheck : startMediaCheck}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors ${
                  isMediaActive
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 shadow-xs'
                }`}
              >
                {isMediaActive ? 'Stop Preview' : 'Check Camera & Mic'}
              </button>
            </div>

            {/* Live Camera Preview Box with Reticle */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 h-36 bg-stone-900 rounded-none border border-stone-200 overflow-hidden relative flex items-center justify-center">
                {isCameraActive ? (
                  <>
                    <video
                      ref={cameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    {/* Reticle Overlay */}
                    <div className="absolute inset-3 pointer-events-none border border-dashed border-white/20 flex flex-col justify-between p-1">
                      <div className="flex justify-between items-start">
                        <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-orange-400" />
                        <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-orange-400" />
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-orange-400" />
                        <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-orange-400" />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-none bg-emerald-950/85 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/50 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Tracking Active</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3">
                    <Camera className="w-6 h-6 text-stone-500 mx-auto mb-1" />
                    <p className="text-[11px] font-bold text-stone-300">Camera Inactive</p>
                    <button
                      type="button"
                      onClick={startMediaCheck}
                      className="mt-1.5 px-2 py-1 text-[10px] font-bold text-orange-400 hover:text-orange-300 underline"
                    >
                      Click to Allow Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Hardware Status & Microphone Level */}
              <div className="sm:col-span-7 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-stone-500" />
                      Microphone Volume:
                    </span>
                    <span className={micVolume > 15 ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                      {micVolume > 10 ? 'Audio Receiving' : isMediaActive ? 'Speak to test...' : 'Offline'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 rounded-none overflow-hidden flex border border-stone-300">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-orange-400 to-rose-500 transition-all duration-75"
                      style={{ width: `${micVolume}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] space-y-1 font-mono text-stone-500">
                  <div className="flex items-center justify-between">
                    <span>Camera Status:</span>
                    <span className={isCameraActive ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {isCameraActive ? '🟢 Connected (15% Weight)' : '⚠️ Action Needed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Eye Contact Sensor:</span>
                    <span className={isCameraActive ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                      {isCameraActive ? 'Calibrated Reticle' : 'Waiting for Video'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-none flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{cameraError}</span>
                </div>
                <button
                  type="button"
                  onClick={startMediaCheck}
                  className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[10px] uppercase rounded-none hover:bg-amber-700 shrink-0"
                >
                  Retry Camera
                </button>
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
                I understand this session evaluates spoken dialogue and camera eye contact. Video and audio are processed securely to score content, vocal delivery, and visual composure.
              </label>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopMediaCheck();
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
