import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Upload,
  Loader2,
  AlertCircle,
  FileText,
  Volume2,
  Clock,
  Sparkles,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { AudioTranscriptionResponse, AudioAnalysisResponse } from '../types';
import { ApiService } from '../services/api';

interface AudioRecorderProps {
  onTranscriptReady: (
    transcript: string,
    audioBlob: Blob,
    analysis: AudioAnalysisResponse | null,
    isEdited: boolean,
    originalTranscript: string
  ) => void;
  initialTranscript?: string;
  initialAudioUrl?: string | null;
  isSubmittingAssessment: boolean;
}

import { convertBlobToWav } from '../utils/audio';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptReady,
  initialTranscript = '',
  initialAudioUrl = null,
  isSubmittingAssessment,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [originalTranscript, setOriginalTranscript] = useState<string>(initialTranscript);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AudioAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Maximum recording time: 3 minutes (180 seconds)
  const MAX_RECORDING_SECONDS = 180;

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone audio recording. You can upload an audio file instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer standard audio formats supported by browser
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        // Stop all media tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());

        // Decode browser WebM/Opus audio and encode to standard 16kHz mono PCM WAV
        const wavBlob = await convertBlobToWav(rawBlob);
        const url = URL.createObjectURL(wavBlob);
        setAudioBlob(wavBlob);
        setAudioUrl(url);

        // Automatically trigger Whisper transcription & feature extraction with pure WAV
        processAudioForTranscription(wavBlob, 'spoken_interview.wav');
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      let msg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission was denied. Please allow microphone access in your browser settings or upload an audio file.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone device was detected on your computer. Please connect a microphone or upload an audio file.';
      }
      setErrorMessage(msg);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Audio file exceeds the maximum 25MB limit.');
      return;
    }

    // Convert uploaded audio (WebM, MP3, OGG, M4A, etc.) to standard 16kHz PCM WAV
    const wavBlob = await convertBlobToWav(file);
    const url = URL.createObjectURL(wavBlob);
    setAudioBlob(wavBlob);
    setAudioUrl(url);
    processAudioForTranscription(wavBlob, file.name.replace(/\.[^/.]+$/, '.wav'));
  };

  const processAudioForTranscription = async (blob: Blob, filename: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      const response: AudioTranscriptionResponse = await ApiService.transcribeAudio(blob, filename);

      const rawText = response.transcript || '';
      setTranscript(rawText);
      setOriginalTranscript(rawText);
      setAnalysis(response.audio_analysis || null);

      onTranscriptReady(
        rawText,
        blob,
        response.audio_analysis || null,
        false,
        rawText
      );
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(
        err.message || 'Whisper transcription failed. Ensure audio is clear and format is supported.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranscriptChange = (newText: string) => {
    setTranscript(newText);
    const isEdited = newText.trim() !== originalTranscript.trim();
    if (audioBlob) {
      onTranscriptReady(newText, audioBlob, analysis, isEdited, originalTranscript);
    }
  };

  const handleReset = () => {
    if (isRecording) stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setOriginalTranscript('');
    setAnalysis(null);
    setRecordingSeconds(0);
    setErrorMessage(null);
    setIsEditingTranscript(false);
  };

  const isEdited = transcript.trim() !== originalTranscript.trim() && originalTranscript.length > 0;

  return (
    <div className="space-y-4">
      {/* Error alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-none flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Recording Control Console */}
      <div className="bg-white border border-slate-200 rounded-none p-6 relative">
        {/* Recording active indicator outline */}
        {isRecording && (
          <div className="absolute inset-0 bg-red-50/30 pointer-events-none border-2 border-red-500 rounded-none animate-pulse" />
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Status & Timer */}
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-none flex items-center justify-center transition-all border ${
                isRecording
                  ? 'bg-red-50 text-red-600 border-red-300'
                  : audioUrl
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {isRecording
                    ? 'Recording Interview Response...'
                    : audioUrl
                    ? 'Recording Ready'
                    : 'Spoken Answer Mode'}
                </span>
                {isRecording && (
                  <span className="inline-block w-2.5 h-2.5 rounded-none bg-red-500 animate-ping" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formatTime(recordingSeconds)} / {formatTime(MAX_RECORDING_SECONDS)}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-slate-500">Whisper Tiny + VAD</span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Sharp square */}
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTranscribing || isSubmittingAssessment}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-none bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider shadow-xs transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>{audioUrl ? 'Record Again' : 'Record Answer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTranscribing || isSubmittingAssessment}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-none bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Recording</span>
              </button>
            )}

            {audioUrl && !isRecording && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isTranscribing}
                className="p-2.5 rounded-none bg-white hover:bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-800 transition-colors"
                title="Clear and reset recording"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Audio Player Widget */}
        {audioUrl && !isRecording && (
          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Volume2 className="w-4 h-4 text-slate-700" />
              <span>Review Recorded Audio:</span>
            </div>
            <audio controls src={audioUrl} className="w-full sm:w-80 h-9" />
          </div>
        )}
      </div>

      {/* Transcription Loading State */}
      {isTranscribing && (
        <div className="bg-white border border-slate-300 rounded-none p-6 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-800 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Transcribing & Analyzing Speech...</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Whisper is running speech-to-text inference while Voice Activity Detection (VAD) measures pause cadences and speaking rate.
          </p>
        </div>
      )}

      {/* Transcript Review Card */}
      {transcript && !isTranscribing && (
        <div className="bg-white border border-slate-200 rounded-none p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Transcription Preview</h4>

              {isEdited ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-amber-50 text-amber-800 border border-amber-300">
                  Edited by Candidate
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-300">
                  Whisper Output
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingTranscript(!isEditingTranscript)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingTranscript ? 'Lock Transcript' : 'Edit Transcript'}</span>
            </button>
          </div>

          {isEditingTranscript ? (
            <textarea
              value={transcript}
              onChange={(e) => handleTranscriptChange(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-900 rounded-none p-3 text-xs text-slate-900 resize-y leading-relaxed outline-none"
              placeholder="Refine transcribed text before submitting..."
            />
          ) : (
            <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-none p-4 leading-relaxed font-mono">
              "{transcript}"
            </p>
          )}

          {/* Instant Speech Metrics Preview Chips */}
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-none">
                <span className="text-[11px] text-slate-500 block uppercase font-mono">Speaking Pace</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {analysis.words_per_minute} <span className="text-xs font-normal text-slate-500">WPM</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-none">
                <span className="text-[11px] text-slate-500 block uppercase font-mono">Speech Ratio</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {(analysis.speech_ratio * 100).toFixed(0)}%
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-none">
                <span className="text-[11px] text-slate-500 block uppercase font-mono">Pauses (&ge;0.4s)</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {analysis.pause_count}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-none">
                <span className="text-[11px] text-slate-500 block uppercase font-mono">Filler Words</span>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {analysis.filler_words.total_filler_count}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
