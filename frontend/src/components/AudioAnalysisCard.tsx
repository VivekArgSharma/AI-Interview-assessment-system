import React from 'react';
import {
  Mic,
  Activity,
  Pause,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  Layers,
  Volume2,
  FileText,
  Cpu,
} from 'lucide-react';
import { AudioAnalysisResponse } from '../types';

interface AudioAnalysisCardProps {
  analysis: AudioAnalysisResponse;
  transcript: string;
  isEdited?: boolean;
  originalTranscript?: string;
}

export const AudioAnalysisCard: React.FC<AudioAnalysisCardProps> = ({
  analysis,
  transcript,
  isEdited = false,
  originalTranscript = '',
}) => {
  const speechPercent = Math.min(100, Math.max(0, analysis.speech_ratio * 100));
  const silencePercent = Math.max(0, 100 - speechPercent);

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Mic className="w-4 h-4 text-slate-700" />
              Speech & Acoustic Delivery Assessment
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-300">
              Descriptive Metrics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Objective speech measurements extracted via Whisper transcription & Voice Activity Detection (VAD).
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono px-2.5 py-1 rounded-none bg-slate-100 text-slate-700 border border-slate-300">
            Total Audio: {analysis.total_duration_seconds.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Transcript Excerpt */}
      <div className="bg-slate-50 border border-slate-200 rounded-none p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            Transcribed Spoken Response:
          </span>
          {isEdited && (
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-none border border-amber-300">
              Candidate edited transcript
            </span>
          )}
        </div>
        <p className="text-xs text-slate-800 leading-relaxed font-mono">
          "{transcript}"
        </p>
        {isEdited && originalTranscript && (
          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
            Original Whisper output: "{originalTranscript}"
          </p>
        )}
      </div>

      {/* Primary KPI Grid - Square */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Speaking Rate */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-mono">
            <span>Speaking Rate</span>
            <Activity className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {analysis.words_per_minute.toFixed(0)}{' '}
            <span className="text-xs font-normal text-slate-500">WPM</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Articulation: <strong className="text-slate-900">{analysis.articulation_rate_wpm.toFixed(0)} WPM</strong>{' '}
            <span className="text-slate-400">(speech-only)</span>
          </div>
        </div>

        {/* Speech vs Silence */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-mono">
            <span>Speech Ratio</span>
            <Volume2 className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {speechPercent.toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-600">
            Speech: <strong className="text-slate-900">{analysis.speech_duration_seconds.toFixed(1)}s</strong> | Silence:{' '}
            <strong className="text-slate-900">{analysis.silence_duration_seconds.toFixed(1)}s</strong>
          </div>
        </div>

        {/* Pause Count & Metrics */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-mono">
            <span>Pauses (&ge;0.4s)</span>
            <Pause className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {analysis.pause_count}
          </div>
          <div className="text-[11px] text-slate-600">
            Avg: <strong className="text-slate-900">{analysis.average_pause_duration.toFixed(2)}s</strong> | Max:{' '}
            <strong className="text-slate-900">{analysis.longest_pause_duration.toFixed(2)}s</strong>
          </div>
        </div>

        {/* Filler Words */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-none space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-mono">
            <span>Filler Words</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {analysis.filler_words.total_filler_count}
          </div>
          <div className="text-[11px] text-slate-600 truncate">
            {analysis.filler_words.filler_words_detected.length > 0
              ? analysis.filler_words.filler_words_detected.join(', ')
              : 'None detected'}
          </div>
        </div>
      </div>

      {/* Visual Speech vs Silence Timeline Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px] font-mono">Speech Activity Breakdown</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-none bg-slate-900" /> Active Speech ({speechPercent.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-none bg-slate-300" /> Silence & Pauses ({silencePercent.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="w-full h-2 rounded-none overflow-hidden bg-slate-200 flex border border-slate-300">
          <div
            className="h-full bg-slate-900 transition-all duration-500"
            style={{ width: `${speechPercent}%` }}
          />
          <div
            className="h-full bg-slate-300 transition-all duration-500"
            style={{ width: `${silencePercent}%` }}
          />
        </div>
      </div>

      {/* Detailed Pause & Filler Word Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Pause Structure */}
        <div className="bg-slate-50 border border-slate-200 rounded-none p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            Pause Distribution & Timing
          </h4>
          <div className="space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Initial silence before response:</span>
              <span className="text-slate-900 font-semibold">{analysis.initial_silence_seconds.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Within-answer qualifying pauses:</span>
              <span className="text-slate-900 font-semibold">{analysis.pause_count} pauses</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Mean within-answer pause length:</span>
              <span className="text-slate-900 font-semibold">{analysis.average_pause_duration.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Trailing silence after response:</span>
              <span className="text-slate-900 font-semibold">{analysis.trailing_silence_seconds.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Frequency rate:</span>
              <span className="text-slate-900 font-semibold">{analysis.pauses_per_minute.toFixed(1)} pauses/min</span>
            </div>
          </div>
        </div>

        {/* Filler Word Instances */}
        <div className="bg-slate-50 border border-slate-200 rounded-none p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
            Filler-Word Observations
          </h4>

          {analysis.filler_words.detected_instances.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No conversational filler words ('um', 'uh', 'er', 'like') detected in the speech transcript.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {analysis.filler_words.detected_instances.map((inst, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 p-2 rounded-none text-xs flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-amber-900 uppercase text-[10px] px-1.5 py-0.5 rounded-none bg-amber-50 border border-amber-300 font-semibold">
                    {inst.word}
                  </span>
                  <span className="text-slate-700 text-[11px] truncate font-mono">
                    "...{inst.surrounding_context}..."
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="text-[10px] text-slate-500 leading-tight border-t border-slate-200 pt-2 flex items-start gap-1.5 font-mono">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{analysis.filler_words.detection_limitations}</span>
          </div>
        </div>
      </div>

      {/* Model & Modality Status Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Cpu className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-slate-900 font-bold flex items-center gap-2">
              <span className="uppercase font-mono text-[11px]">Speech Processing Method:</span>
              <span className="font-mono text-slate-700">{analysis.method}</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Learned delivery scoring: <strong className="text-slate-900">Not yet measured</strong> (preserves empirical honesty; avoids subjective grading without human-calibrated audio models).
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono px-2 py-1 rounded-none bg-slate-100 text-slate-600 border border-slate-300">
            wav2vec 2.0: Interface Defined
          </span>
        </div>
      </div>
    </div>
  );
};
