import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Mic, Bot, UserCheck, ShieldCheck } from 'lucide-react';
import { voiceEngine, VisemeFrame } from '../services/voiceEngine';

interface InterviewerAvatarProps {
  voicePreference?: string;
  isSpeaking: boolean;
  isListening?: boolean;
  questionText?: string;
  onBargeIn?: () => void;
  onReplayVoice?: () => void;
  compact?: boolean;
}

export const InterviewerAvatar: React.FC<InterviewerAvatarProps> = ({
  voicePreference = 'en-US-JennyNeural',
  isSpeaking,
  isListening = false,
  questionText,
  onBargeIn,
  onReplayVoice,
  compact = false,
}) => {
  // Viseme & Audio Reaction State
  const [visemeFrame, setVisemeFrame] = useState<VisemeFrame>({
    amplitude: 0,
    viseme: 'rest',
    isSpeaking: false,
    timestamp: Date.now(),
  });

  // Animated Rigging Parameters (interpolated smoothly at 60 FPS)
  const [mouthOpen, setMouthOpen] = useState<number>(0);
  const [mouthWidth, setMouthWidth] = useState<number>(0);
  const [blinkProgress, setBlinkProgress] = useState<number>(0);
  const [headTilt, setHeadTilt] = useState<number>(0);
  const [breathingY, setBreathingY] = useState<number>(0);
  const [gazeX, setGazeX] = useState<number>(0);
  const [gazeY, setGazeY] = useState<number>(0);

  // Animation & Timing Refs
  const targetMouthOpenRef = useRef<number>(0);
  const targetMouthWidthRef = useRef<number>(0);
  const currentMouthOpenRef = useRef<number>(0);
  const currentMouthWidthRef = useRef<number>(0);
  const blinkStateRef = useRef<{ isBlinking: boolean; startTime: number; nextBlinkTime: number }>({
    isBlinking: false,
    startTime: 0,
    nextBlinkTime: Date.now() + 3500,
  });
  const animFrameRef = useRef<number | null>(null);

  // Subscribe to real-time viseme stream from voiceEngine
  useEffect(() => {
    const unsub = voiceEngine.subscribeViseme((frame) => {
      setVisemeFrame(frame);
      if (frame.isSpeaking) {
        // Target mouth opening proportional to amplitude
        targetMouthOpenRef.current = Math.min(24, Math.max(0, frame.amplitude * 24));
        // Viseme-specific width deformation
        if (frame.viseme === 'ee') {
          targetMouthWidthRef.current = 14;
        } else if (frame.viseme === 'oo' || frame.viseme === 'oh') {
          targetMouthWidthRef.current = -8;
        } else if (frame.viseme === 'th') {
          targetMouthWidthRef.current = 6;
          targetMouthOpenRef.current = Math.min(8, targetMouthOpenRef.current);
        } else {
          targetMouthWidthRef.current = 2;
        }
      } else {
        targetMouthOpenRef.current = 0;
        targetMouthWidthRef.current = 0;
      }
    });

    return () => unsub();
  }, []);

  // 60 FPS Render & Physics Loop
  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      const wallTime = Date.now();

      // 1. Smooth Spring-Damper Lip-Sync Interpolation (Lerp)
      currentMouthOpenRef.current += (targetMouthOpenRef.current - currentMouthOpenRef.current) * 0.28;
      currentMouthWidthRef.current += (targetMouthWidthRef.current - currentMouthWidthRef.current) * 0.25;

      setMouthOpen(+currentMouthOpenRef.current.toFixed(2));
      setMouthWidth(+currentMouthWidthRef.current.toFixed(2));

      // 2. Realistic Natural Human Eye Blinking
      const blink = blinkStateRef.current;
      if (!blink.isBlinking && wallTime > blink.nextBlinkTime) {
        blink.isBlinking = true;
        blink.startTime = now;
      }

      if (blink.isBlinking) {
        const elapsed = now - blink.startTime;
        const blinkDuration = 140; // 140ms natural human eyelid sweep
        if (elapsed < blinkDuration) {
          // Sine curve up to 1 and back down to 0
          const progress = Math.sin((elapsed / blinkDuration) * Math.PI);
          setBlinkProgress(+progress.toFixed(3));
        } else {
          blink.isBlinking = false;
          setBlinkProgress(0);
          // Next blink between 3.5s and 5.5s with random jitter
          blink.nextBlinkTime = wallTime + 3500 + Math.random() * 2200;
        }
      }

      // 3. Subtle Sinusoidal Breathing & Head Dynamics
      const breath = Math.sin(now * 0.0018) * 1.6;
      setBreathingY(+breath.toFixed(2));

      if (isSpeaking) {
        // Natural speech cadence head tilt & affirmative nodding
        const speechTilt = Math.sin(now * 0.0035) * 1.8 + Math.cos(now * 0.0019) * 0.9;
        setHeadTilt(+speechTilt.toFixed(2));
        setGazeX(Math.sin(now * 0.002) * 1.2);
        setGazeY(Math.cos(now * 0.0025) * 0.8);
      } else if (isListening) {
        // Active Listening: Affirmative periodic head nodding every ~3.5s
        const nodCycle = (now % 3600) / 3600;
        let nod = 0;
        if (nodCycle < 0.28) {
          nod = Math.sin(nodCycle * Math.PI * 3.5) * 2.8;
        }
        setHeadTilt(+(1.2 + nod).toFixed(2)); // Slight inquisitive head tilt + nod
        setGazeX(0);
        setGazeY(0.5);
      } else {
        // Idle relaxed pose
        setHeadTilt(+(Math.sin(now * 0.001) * 0.6).toFixed(2));
        setGazeX(0);
        setGazeY(0);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, isListening]);

  // Determine Persona Appearance
  const isMale =
    voicePreference.includes('Guy') ||
    voicePreference.includes('Christopher') ||
    voicePreference.includes('Male');

  const personaName = isMale
    ? voicePreference.includes('Guy')
      ? 'Guy (Senior Architect)'
      : 'Christopher (Hiring Lead)'
    : voicePreference.includes('Aria')
    ? 'Aria (Assessment Director)'
    : voicePreference.includes('Sonia')
    ? 'Sonia (Consultative Mentor)'
    : 'Jenny (Executive Recruiter)';

  const personaRole = isMale
    ? 'Technical System Architect'
    : 'Executive Assessment Partner';

  // Dynamic SVG Mouth Paths based on visemes and lerped mouthOpen & mouthWidth
  // Base mouth center is at (200, 222)
  const mouthCenterX = 200;
  const mouthCenterY = 222;
  const halfWidth = 24 + mouthWidth;
  const openH = mouthOpen;

  // Upper lip curve: Cupid's bow contour
  const upperLipPath = `
    M ${mouthCenterX - halfWidth} ${mouthCenterY}
    Q ${mouthCenterX - halfWidth * 0.5} ${mouthCenterY - 4 - openH * 0.15} ${mouthCenterX - 4} ${mouthCenterY - 3}
    Q ${mouthCenterX} ${mouthCenterY - 1} ${mouthCenterX + 4} ${mouthCenterY - 3}
    Q ${mouthCenterX + halfWidth * 0.5} ${mouthCenterY - 4 - openH * 0.15} ${mouthCenterX + halfWidth} ${mouthCenterY}
    Q ${mouthCenterX} ${mouthCenterY + 1} ${mouthCenterX - halfWidth} ${mouthCenterY}
  `;

  // Lower lip curve
  const lowerLipPath = `
    M ${mouthCenterX - halfWidth} ${mouthCenterY}
    Q ${mouthCenterX} ${mouthCenterY + openH + 6} ${mouthCenterX + halfWidth} ${mouthCenterY}
    Q ${mouthCenterX} ${mouthCenterY + openH + 11} ${mouthCenterX - halfWidth} ${mouthCenterY}
  `;

  // Oral cavity inside opening (visible when openH > 2)
  const cavityPath = `
    M ${mouthCenterX - halfWidth + 2} ${mouthCenterY}
    Q ${mouthCenterX} ${mouthCenterY - 1 - openH * 0.1} ${mouthCenterX + halfWidth - 2} ${mouthCenterY}
    Q ${mouthCenterX} ${mouthCenterY + openH + 4} ${mouthCenterX - halfWidth + 2} ${mouthCenterY}
    Z
  `;

  return (
    <div className="bg-white border border-stone-200 rounded-none shadow-xs overflow-hidden">
      {/* Top Avatar Video Stream Header */}
      <div className="px-5 py-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span
              className={`w-2.5 h-2.5 rounded-full inline-block ${
                isSpeaking
                  ? 'bg-emerald-400 animate-ping'
                  : isListening
                  ? 'bg-orange-400 animate-pulse'
                  : 'bg-stone-500'
              }`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full absolute top-0 left-0 ${
                isSpeaking ? 'bg-emerald-400' : isListening ? 'bg-orange-400' : 'bg-stone-500'
              }`}
            />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              {personaName}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {isSpeaking ? 'Voicing Question (60 FPS Lip-Sync)' : isListening ? 'Listening Attentively...' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Viseme: {visemeFrame.viseme.toUpperCase()}</span>
            </div>
          )}

          {isSpeaking && onBargeIn && (
            <button
              onClick={onBargeIn}
              className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider border border-rose-400/50 flex items-center gap-1"
            >
              <VolumeX className="w-3 h-3" />
              <span>Barge-in</span>
            </button>
          )}

          {onReplayVoice && !isSpeaking && (
            <button
              onClick={onReplayVoice}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold uppercase tracking-wider border border-stone-700 flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3 text-orange-400" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* 2D Realistic Avatar SVG Canvas (Responsive 16:10 / 4:3 studio frame) */}
      <div className={`relative bg-gradient-to-b from-stone-900 via-stone-950 to-black overflow-hidden flex items-center justify-center ${compact ? 'h-56' : 'h-72'}`}>
        <svg
          viewBox="0 0 400 320"
          className="w-full h-full select-none"
          style={{ transform: `translateY(${breathingY}px)` }}
        >
          <defs>
            {/* Background Executive Studio Gradient */}
            <radialGradient id="studioLighting" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2c3a4f" stopOpacity="0.8" />
              <stop offset="55%" stopColor="#151e2b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0a0e14" stopOpacity="1" />
            </radialGradient>

            {/* Skin Tone & Lighting Gradients */}
            <linearGradient id="skinBase" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isMale ? '#f1d1b5' : '#f9dbcc'} />
              <stop offset="50%" stopColor={isMale ? '#e2bc9d' : '#f3c7b3'} />
              <stop offset="100%" stopColor={isMale ? '#c8997a' : '#dfa891'} />
            </linearGradient>

            <linearGradient id="skinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c7937b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8d5843" stopOpacity="0.75" />
            </linearGradient>

            {/* Hair Gradients */}
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isMale ? '#3a322c' : '#4a2f1c'} />
              <stop offset="40%" stopColor={isMale ? '#231d18' : '#311c0f'} />
              <stop offset="100%" stopColor={isMale ? '#120f0d' : '#190d06'} />
            </linearGradient>

            {/* Eyes & Iris Radial Gradients */}
            <radialGradient id="irisGrad" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor={isMale ? '#6b462b' : '#556b43'} />
              <stop offset="65%" stopColor={isMale ? '#382213' : '#2d3d20'} />
              <stop offset="100%" stopColor="#100b06" />
            </radialGradient>

            {/* Lip Color Gradient */}
            <linearGradient id="upperLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isMale ? '#b37160' : '#cf6865'} />
              <stop offset="100%" stopColor={isMale ? '#8f4f40' : '#b04946'} />
            </linearGradient>

            <linearGradient id="lowerLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isMale ? '#c48271' : '#e57b77'} />
              <stop offset="100%" stopColor={isMale ? '#a15b4c' : '#bd524e'} />
            </linearGradient>

            {/* Clothes / Blazer Gradients */}
            <linearGradient id="blazerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isMale ? '#2d333b' : '#1b2838'} />
              <stop offset="60%" stopColor={isMale ? '#1c2126' : '#101a24'} />
              <stop offset="100%" stopColor={isMale ? '#0f1214' : '#080d12'} />
            </linearGradient>
          </defs>

          {/* 1. Studio Backdrop */}
          <rect width="400" height="320" fill="url(#studioLighting)" />

          {/* Depth of field architectural bokeh orbs */}
          <circle cx="90" cy="70" r="45" fill="#f97316" opacity="0.04" />
          <circle cx="320" cy="90" r="55" fill="#38bdf8" opacity="0.04" />

          {/* 2. Torso & Business Suit / Blazer (Anchor at bottom) */}
          <g transform={`translate(0, ${breathingY * 0.4})`}>
            {/* Inner shirt / blouse */}
            <path
              d="M 160 250 L 200 285 L 240 250 L 255 320 L 145 320 Z"
              fill={isMale ? '#1c2229' : '#f5f5f2'}
            />
            {/* Blazer Body */}
            <path
              d="M 60 320 L 115 240 Q 155 235 200 248 Q 245 235 285 240 L 340 320 Z"
              fill="url(#blazerGrad)"
            />
            {/* Blazer Lapels */}
            <path
              d="M 115 240 L 175 320 L 195 320 L 155 242 Z"
              fill="#223348"
              opacity="0.8"
            />
            <path
              d="M 285 240 L 225 320 L 205 320 L 245 242 Z"
              fill="#223348"
              opacity="0.8"
            />
          </g>

          {/* 3. Neck & Throat (with head tilt anchor) */}
          <g transform={`rotate(${headTilt}, 200, 240)`}>
            <path
              d="M 178 190 L 174 255 Q 200 262 226 255 L 222 190 Z"
              fill="url(#skinBase)"
            />
            {/* Neck drop shadow under chin */}
            <path
              d="M 176 190 Q 200 212 224 190 L 226 210 Q 200 226 174 210 Z"
              fill="url(#skinShadow)"
              opacity="0.65"
            />

            {/* 4. Ears */}
            <ellipse cx="140" cy="155" rx="8" ry="14" fill="url(#skinBase)" />
            <ellipse cx="260" cy="155" rx="8" ry="14" fill="url(#skinBase)" />

            {/* 5. Face Base Structure (Sculpted oval jaw) */}
            <path
              d={
                isMale
                  ? 'M 148 120 C 145 70, 255 70, 252 120 C 254 165, 238 202, 200 205 C 162 202, 146 165, 148 120 Z'
                  : 'M 148 120 C 146 72, 254 72, 252 120 C 253 162, 232 198, 200 202 C 168 198, 147 162, 148 120 Z'
              }
              fill="url(#skinBase)"
            />

            {/* Cheekbone & Chin Highlights */}
            <ellipse cx="168" cy="162" rx="14" ry="10" fill={isMale ? '#c8997a' : '#f29e8e'} opacity={isMale ? '0.15' : '0.22'} />
            <ellipse cx="232" cy="162" rx="14" ry="10" fill={isMale ? '#c8997a' : '#f29e8e'} opacity={isMale ? '0.15' : '0.22'} />
            <ellipse cx="200" cy="192" rx="10" ry="6" fill="#ffffff" opacity="0.08" />

            {/* 6. Hair Layer (Base & Front Styling) */}
            {isMale ? (
              // Guy / Male Professional Cut
              <path
                d="M 140 125 C 136 82, 160 56, 200 56 C 240 56, 264 82, 260 125 C 258 115, 250 96, 240 92 C 220 84, 180 84, 160 92 C 150 96, 142 115, 140 125 Z"
                fill="url(#hairGrad)"
              />
            ) : (
              // Jenny / Female Executive Bob Styling
              <>
                {/* Back hair silhouette */}
                <path
                  d="M 132 130 C 124 160, 126 215, 145 235 C 152 205, 145 170, 144 140 Z"
                  fill="#1b0f07"
                />
                <path
                  d="M 268 130 C 276 160, 274 215, 255 235 C 248 205, 255 170, 256 140 Z"
                  fill="#1b0f07"
                />
                {/* Main front crown & bangs */}
                <path
                  d="M 136 128 C 132 76, 162 52, 200 52 C 238 52, 268 76, 264 128 C 262 108, 245 88, 222 86 C 195 84, 165 92, 144 116 Z"
                  fill="url(#hairGrad)"
                />
              </>
            )}

            {/* 7. Eyebrows (reactive to questioning tone) */}
            <path
              d={isMale ? 'M 160 128 Q 175 124 188 127' : 'M 162 130 Q 174 124 187 128'}
              stroke="#2e1d13"
              strokeWidth={isMale ? '3.5' : '2.5'}
              strokeLinecap="round"
              fill="none"
              style={{ transform: `translateY(${isSpeaking ? -1.5 : 0}px)` }}
            />
            <path
              d={isMale ? 'M 212 127 Q 225 124 240 128' : 'M 213 128 Q 226 124 238 130'}
              stroke="#2e1d13"
              strokeWidth={isMale ? '3.5' : '2.5'}
              strokeLinecap="round"
              fill="none"
              style={{ transform: `translateY(${isSpeaking ? -1.5 : 0}px)` }}
            />

            {/* 8. Eyes & Eyelids (with Natural Blinking & Catchlights) */}
            {/* Left Eye Socket */}
            <g transform="translate(174, 142)">
              {/* White Sclera */}
              <ellipse cx="0" cy="0" rx="10" ry="6" fill="#f7f9fa" />
              {/* Iris */}
              <ellipse cx={gazeX} cy={gazeY} rx="4.8" ry="4.8" fill="url(#irisGrad)" />
              {/* Pupil */}
              <circle cx={gazeX} cy={gazeY} r="2.2" fill="#000000" />
              {/* Specular corneal highlight */}
              <circle cx={gazeX - 1.2} cy={gazeY - 1.2} r="1.1" fill="#ffffff" opacity="0.9" />

              {/* Upper Eyelid that sweeps down on blink (0 -> 1) */}
              <path
                d={`M -11 -6 Q 0 ${-6 + blinkProgress * 13} 11 -6 L 11 -10 L -11 -10 Z`}
                fill="url(#skinBase)"
              />
              {/* Eyelash edge */}
              <path
                d={`M -11 -6 Q 0 ${-6 + blinkProgress * 13} 11 -6`}
                stroke="#2a1810"
                strokeWidth={isMale ? '1.5' : '2.2'}
                fill="none"
              />
            </g>

            {/* Right Eye Socket */}
            <g transform="translate(226, 142)">
              {/* White Sclera */}
              <ellipse cx="0" cy="0" rx="10" ry="6" fill="#f7f9fa" />
              {/* Iris */}
              <ellipse cx={gazeX} cy={gazeY} rx="4.8" ry="4.8" fill="url(#irisGrad)" />
              {/* Pupil */}
              <circle cx={gazeX} cy={gazeY} r="2.2" fill="#000000" />
              {/* Specular corneal highlight */}
              <circle cx={gazeX - 1.2} cy={gazeY - 1.2} r="1.1" fill="#ffffff" opacity="0.9" />

              {/* Upper Eyelid that sweeps down on blink (0 -> 1) */}
              <path
                d={`M -11 -6 Q 0 ${-6 + blinkProgress * 13} 11 -6 L 11 -10 L -11 -10 Z`}
                fill="url(#skinBase)"
              />
              {/* Eyelash edge */}
              <path
                d={`M -11 -6 Q 0 ${-6 + blinkProgress * 13} 11 -6`}
                stroke="#2a1810"
                strokeWidth={isMale ? '1.5' : '2.2'}
                fill="none"
              />
            </g>

            {/* Optional Glasses for Architect Guy */}
            {isMale && voicePreference.includes('Guy') && (
              <g stroke="#3a271d" strokeWidth="2.2" fill="none" opacity="0.92">
                <rect x="158" y="132" width="32" height="20" rx="4" />
                <rect x="210" y="132" width="32" height="20" rx="4" />
                <path d="M 190 140 Q 200 137 210 140" />
                {/* Temple arms */}
                <path d="M 158 138 L 142 142" />
                <path d="M 242 138 L 258 142" />
                {/* Subtle lens anti-reflective glare */}
                <line x1="162" y1="135" x2="174" y2="149" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
                <line x1="214" y1="135" x2="226" y2="149" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
              </g>
            )}

            {/* 9. Nose Bridge & Contours */}
            <path
              d="M 197 142 Q 199 168 194 175 Q 200 178 206 175 Q 201 168 203 142"
              fill="none"
              stroke="#c7937b"
              strokeWidth="1.6"
              opacity="0.55"
            />
            {/* Nostrils */}
            <ellipse cx="193" cy="176" rx="2.5" ry="1.2" fill="#8d5843" opacity="0.6" />
            <ellipse cx="207" cy="176" rx="2.5" ry="1.2" fill="#8d5843" opacity="0.6" />
            {/* Philtrum dip */}
            <path d="M 198 180 L 198 186 M 202 180 L 202 186" stroke="#c7937b" strokeWidth="1" opacity="0.3" />

            {/* 10. REAL-TIME LIP-SYNCING MOUTH & JAWS */}
            <g id="mouthRig">
              {/* Inner oral cavity background when open */}
              {openH > 2 && (
                <path d={cavityPath} fill="#240707" />
              )}

              {/* Upper dental arch (teeth visible when speaking) */}
              {openH > 3 && (
                <path
                  d={`M ${mouthCenterX - halfWidth * 0.65} ${mouthCenterY}
                      Q ${mouthCenterX} ${mouthCenterY + 1} ${mouthCenterX + halfWidth * 0.65} ${mouthCenterY}
                      Q ${mouthCenterX} ${mouthCenterY + Math.min(6, openH * 0.55)} ${mouthCenterX - halfWidth * 0.65} ${mouthCenterY} Z`}
                  fill="#fafbf7"
                  opacity="0.95"
                />
              )}

              {/* Tongue hint (visible on wide vowels) */}
              {openH > 10 && (
                <path
                  d={`M ${mouthCenterX - 10} ${mouthCenterY + openH + 2}
                      Q ${mouthCenterX} ${mouthCenterY + openH - 4} ${mouthCenterX + 10} ${mouthCenterY + openH + 2} Z`}
                  fill="#d46b70"
                />
              )}

              {/* Upper Lip with Cupid's bow contour */}
              <path
                d={upperLipPath}
                fill="url(#upperLipGrad)"
              />

              {/* Lower Lip with full curved volume */}
              <path
                d={lowerLipPath}
                fill="url(#lowerLipGrad)"
              />

              {/* Lip Gloss & Highlight Sheen */}
              <ellipse
                cx={mouthCenterX}
                cy={mouthCenterY + openH + 6}
                rx={Math.max(4, halfWidth * 0.35)}
                ry="1.4"
                fill="#ffffff"
                opacity="0.28"
              />

              {/* Corner dimple shadows */}
              <circle cx={mouthCenterX - halfWidth} cy={mouthCenterY} r="1.5" fill="#6d3025" opacity="0.5" />
              <circle cx={mouthCenterX + halfWidth} cy={mouthCenterY} r="1.5" fill="#6d3025" opacity="0.5" />
            </g>
          </g>
        </svg>

        {/* Live Audio Equalizer Overlay in Corner */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-none bg-stone-900/80 backdrop-blur-xs border border-white/10 text-white text-[10px] font-mono flex items-center gap-2">
          {isSpeaking ? (
            <>
              <div className="flex items-end gap-1 h-3.5">
                <span className="w-1 bg-emerald-400 animate-pulse" style={{ height: `${Math.max(25, mouthOpen * 4)}%` }} />
                <span className="w-1 bg-emerald-400 animate-pulse" style={{ height: `${Math.max(45, mouthOpen * 4.5)}%` }} />
                <span className="w-1 bg-emerald-400 animate-pulse" style={{ height: `${Math.max(30, mouthOpen * 3.5)}%` }} />
              </div>
              <span className="text-emerald-300 font-bold">Neural Speech Sync</span>
            </>
          ) : isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-300 font-bold">Listening to You</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
              <span className="text-stone-400">Interviewer Idle</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
