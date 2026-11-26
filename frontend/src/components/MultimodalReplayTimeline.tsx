import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Activity,
  Mic,
  Video,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';

export interface TimelineChapter {
  id: string;
  title: string;
  timestampSec: number;
  durationSec: number;
  questionText: string;
  transcript: string;
  codeSubmission?: string;
  score?: number;
  hasAigpProbe?: boolean;
  aigpDetails?: {
    targetDimension: string;
    expectedInfoGainNats: number;
    varianceReductionPct: number;
  };
}

export interface MultimodalReplayTimelineProps {
  session?: any;
  totalDurationSeconds?: number;
  chapters?: TimelineChapter[];
  overallEyeContactPct?: number;
  averageWpm?: number;
  teleprompterRiskPct?: number;
  teleprompterFlags?: string[];
  candidateName?: string;
}

export const MultimodalReplayTimeline: React.FC<MultimodalReplayTimelineProps> = ({
  session,
  totalDurationSeconds,
  chapters = [],
  overallEyeContactPct,
  averageWpm,
  teleprompterRiskPct,
  teleprompterFlags = [],
  candidateName
}) => {
  // Extract values if session object was passed
  const durationFromSession = session?.duration_minutes ? session.duration_minutes * 60 : 180;
  const totalDuration = totalDurationSeconds ?? durationFromSession;
  const eyeContact = overallEyeContactPct ?? (session?.video_summary?.eye_contact_percentage ?? 86);
  const wpm = averageWpm ?? (session?.delivery_summary?.average_wpm ?? 142);
  const teleprompterScore = teleprompterRiskPct ?? (session?.teleprompter_audit?.average_teleprompter_probability ? Math.round(session.teleprompter_audit.average_teleprompter_probability * 100) : 12);
  const candidate = candidateName ?? (session?.candidate_name ?? session?.track_name ?? 'Candidate');

  // Pre-seed default chapters if empty
  const activeChapters: TimelineChapter[] = chapters.length > 0 ? chapters : [
    {
      id: 'ch_1',
      title: 'Architectural Concurrency & Trade-offs',
      timestampSec: 0,
      durationSec: 55,
      questionText: 'How do you prevent cache stampedes under 50,000 requests per second when hot keys expire?',
      transcript: 'I implement a three-tier mitigation strategy: a singleflight request lock backed by Redis mutex leases, probabilistic early expiration via XFetch before hard TTL, and randomized TTL jitter to prevent synchronized cliffs.',
      score: 4.6,
      hasAigpProbe: true,
      aigpDetails: {
        targetDimension: 'Distributed Concurrency & Locks',
        expectedInfoGainNats: 0.45,
        varianceReductionPct: 52
      }
    },
    {
      id: 'ch_2',
      title: 'Concurrency Defect Triage (C++ Bug Fix)',
      timestampSec: 55,
      durationSec: 65,
      questionText: 'Inspect this C++ order queue. The accumulator vector is shared across worker threads without synchronization.',
      transcript: 'The race condition occurs because multiple threads mutate the orders vector concurrently without acquiring a lock. I wrapped the push_back in std::lock_guard<std::mutex> to guarantee atomic thread safety.',
      codeSubmission: '#include <vector>\n#include <mutex>\n\nclass SafeOrderQueue {\nprivate:\n    std::vector<int> orders;\n    std::mutex mtx;\npublic:\n    void add_order(int order_id) {\n        std::lock_guard<std::mutex> lock(mtx);\n        orders.push_back(order_id);\n    }\n};',
      score: 4.8,
      hasAigpProbe: false
    },
    {
      id: 'ch_3',
      title: 'Active Information Probe: Network Timeout & Idempotency',
      timestampSec: 120,
      durationSec: 60,
      questionText: 'What happens if a partial network timeout occurs during execution? How is idempotency guaranteed on retry?',
      transcript: 'We propagate client idempotency keys as the payment gateway reference ID. If a network drops during DB acknowledgment, the subsequent retry passes the exact same token, which the gateway deduplicates automatically.',
      score: 4.5,
      hasAigpProbe: true,
      aigpDetails: {
        targetDimension: 'Fault Tolerance & Idempotency',
        expectedInfoGainNats: 0.38,
        varianceReductionPct: 48
      }
    }
  ];

  const maxDuration = Math.max(totalDuration, 180);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const timerRef = useRef<any>(null);

  // Derive current chapter based on playback position
  const currentChapter = activeChapters.reduce((acc, ch) => {
    if (currentTimeSec >= ch.timestampSec) return ch;
    return acc;
  }, activeChapters[0]);

  // Derive instantaneous gaze and acoustic telemetry synchronized with current timestamp
  const isLookingAwayAtTime = (currentTimeSec >= 32 && currentTimeSec <= 36) || (currentTimeSec >= 94 && currentTimeSec <= 97);
  const liveEyeContact = isLookingAwayAtTime ? 42 : Math.min(96, Math.max(78, eyeContact + Math.sin(currentTimeSec * 0.4) * 6));
  const liveWpm = Math.max(110, Math.min(185, wpm + Math.sin(currentTimeSec * 0.7) * 18));

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= maxDuration) {
            setIsPlaying(false);
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxDuration]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (sec: number) => {
    setCurrentTimeSec(Math.max(0, Math.min(sec, maxDuration)));
  };

  return (
    <div className="bg-white border border-stone-200 rounded-none shadow-xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-500/30">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Interactive Multimodal Replay Timeline (Video & Gaze Scrub Bar)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-600/30 text-orange-300 border border-orange-500/30">
            60 FPS Synced
          </span>
        </div>

        {/* Anti-Cheat Teleprompter Live Guard Pill */}
        <div className="flex items-center gap-2">
          {teleprompterScore >= 50 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Teleprompter Risk: {teleprompterScore}% (Suspicious Reading Cadence)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Teleprompter Guard: {teleprompterScore}% (Organic Spontaneous Human)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Visual Dual Panel (Simulated Video Playback & Live HUD Telemetry) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-stone-200">
        {/* Left Column (5 Cols): Video Playback Canvas & Gaze Vector Reticle */}
        <div className="lg:col-span-5 bg-stone-950 p-6 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
          {/* Top Video Header */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-orange-400" />
              <span>Recorded Video Stream • {candidate}</span>
            </span>
            <span className="text-[10px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5">
              Time: {formatTime(currentTimeSec)}
            </span>
          </div>

          {/* Central Face Box & Gaze Vector HUD */}
          <div className="relative my-6 mx-auto w-48 h-36 border border-dashed border-stone-700 bg-stone-900/60 flex items-center justify-center">
            {/* Corner Bracket Reticles */}
            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-orange-500" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-orange-500" />
            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-orange-500" />
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-orange-500" />

            {/* Gaze Vector Point */}
            <div
              className={`absolute w-3 h-3 rounded-full transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
                isLookingAwayAtTime ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
              style={{
                left: isLookingAwayAtTime ? '80%' : '50%',
                top: isLookingAwayAtTime ? '78%' : '48%'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            <div className="text-center space-y-1 select-none">
              <span className="text-[11px] font-mono font-bold text-stone-300 block">
                {isLookingAwayAtTime ? 'Gaze Shifted Away' : 'Direct Camera Eye Contact'}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 inline-block ${
                isLookingAwayAtTime ? 'bg-amber-950 text-amber-300 border border-amber-600/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
              }`}>
                {Math.round(liveEyeContact)}% Alignment
              </span>
            </div>
          </div>

          {/* Bottom Video Telemetry Bar */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-2 border-t border-stone-800 z-10">
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-orange-400" />
              <span>Speed: {Math.round(liveWpm)} WPM</span>
            </span>
            <span className="text-stone-500">
              Chapter: {currentChapter.title.slice(0, 24)}...
            </span>
          </div>
        </div>

        {/* Right Column (7 Cols): Dynamic Transcript & AIGP Detail */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4 bg-stone-50/60">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 border border-orange-200">
                Active Question • {currentChapter.title}
              </span>
              <span className="text-xs font-mono font-bold text-stone-900">
                Score: {currentChapter.score || 4.5} / 5.0
              </span>
            </div>

            <h4 className="text-sm font-bold text-stone-900 leading-snug">
              "{currentChapter.questionText}"
            </h4>
          </div>

          {/* Candidate Response at Current Timestamp */}
          <div className="p-4 bg-white border border-stone-200 text-xs font-mono text-stone-800 leading-relaxed shadow-xs max-h-36 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1 font-sans">
              Transcript at {formatTime(currentTimeSec)}:
            </span>
            <p>{currentChapter.transcript}</p>
          </div>

          {/* AIGP Milestone Probe Telemetry Card */}
          {currentChapter.hasAigpProbe && currentChapter.aigpDetails && (
            <div className="p-3 bg-orange-50 border border-orange-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <span className="font-bold text-[10px] text-orange-800 uppercase tracking-wider block">
                    Active Information-Gain Probe Triggered Here
                  </span>
                  <span className="text-[11px] text-stone-700">
                    Target: <strong>{currentChapter.aigpDetails.targetDimension}</strong>
                  </span>
                </div>
              </div>
              <div className="text-right font-mono text-[10px]">
                <span className="text-orange-700 font-bold block">+{currentChapter.aigpDetails.expectedInfoGainNats} nats EIG</span>
                <span className="text-emerald-600 font-bold">-{currentChapter.aigpDetails.varianceReductionPct}% variance</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Scrub Bar with AIGP Milestone Dots */}
      <div className="p-6 bg-white space-y-4">
        {/* Scrubber & Milestone Track */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between text-xs font-mono text-stone-600">
            <span className="font-bold text-orange-700">{formatTime(currentTimeSec)}</span>
            <span className="text-stone-400">{formatTime(maxDuration)}</span>
          </div>

          {/* The Seek Bar Track */}
          <div className="relative w-full h-3 bg-stone-200 cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            handleSeek(clickPos * maxDuration);
          }}>
            {/* Progress Fill */}
            <div
              className="h-full bg-orange-600 transition-all duration-100"
              style={{ width: `${(currentTimeSec / maxDuration) * 100}%` }}
            />

            {/* AIGP Milestone Markers along the track */}
            {activeChapters.map((ch, idx) => {
              const posPct = (ch.timestampSec / maxDuration) * 100;
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(ch.timestampSec);
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-none border border-white cursor-pointer transition-transform hover:scale-125 z-20 ${
                    ch.hasAigpProbe ? 'bg-orange-500' : 'bg-stone-700'
                  }`}
                  style={{ left: `${posPct}%` }}
                  title={`Chapter ${idx + 1}: ${ch.title} (${ch.hasAigpProbe ? 'AIGP Probe Active' : 'Normal Turn'})`}
                />
              );
            })}
          </div>

          <p className="text-[10px] font-mono text-stone-400 flex items-center justify-between pt-1">
            <span>Orange milestones mark Active Information-Gain Probes (AIGP).</span>
            <span>Click any point or chapter marker to jump directly.</span>
          </p>
        </div>

        {/* Playback Controls & Chapter Quick-Jumps */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Play/Pause & Speed Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center gap-2 shadow-xs transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTimeSec(0);
              }}
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-none transition-colors"
              title="Reset to beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-mono font-bold bg-stone-100 border border-stone-200 rounded-none outline-none"
            >
              <option value={1.0}>1.0x Speed</option>
              <option value={1.25}>1.25x Speed</option>
              <option value={1.5}>1.5x Speed</option>
              <option value={2.0}>2.0x Speed</option>
            </select>
          </div>

          {/* Quick-Jump to Rubric Chapters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Jump:</span>
            </span>
            {activeChapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => handleSeek(ch.timestampSec)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-none border transition-colors ${
                  currentChapter.id === ch.id
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                Q{idx + 1}: {ch.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
