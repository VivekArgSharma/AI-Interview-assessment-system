import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  Square,
  RotateCcw,
  Send,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  LogOut,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Edit3,
  Bot,
  Radio,
  Clock
} from 'lucide-react';
import {
  InterviewSessionData,
  QuestionData,
  AnswerResponseData
} from '../types';
import { ApiService } from '../services/api';
import { convertBlobToWav } from '../utils/audio';

interface LiveInterviewRoomProps {
  session: InterviewSessionData;
  onSessionUpdate: (session: InterviewSessionData) => void;
  onSessionFinish: (reportId?: string) => void;
  onExit: () => void;
}

export const LiveInterviewRoom: React.FC<LiveInterviewRoomProps> = ({
  session,
  onSessionUpdate,
  onSessionFinish,
  onExit,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(session.current_question || null);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [latestFollowUpMessage, setLatestFollowUpMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(session.status === 'paused');

  // Elapsed interview session timer
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const speechRecogRef = useRef<any>(null);

  // Initialize or fetch current question
  useEffect(() => {
    if (!currentQuestion) {
      loadCurrentQuestion();
    }
  }, [session.id]);

  // Session elapsed timer
  useEffect(() => {
    if (!isPaused && session.status === 'in_progress') {
      sessionTimerRef.current = setInterval(() => {
        setSessionElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [isPaused, session.status]);

  // Auto-speak question when question changes
  useEffect(() => {
    if (currentQuestion && !isPaused) {
      speakQuestionText(currentQuestion.question_text);
    }
  }, [currentQuestion?.id]);

  const loadCurrentQuestion = async () => {
    try {
      const q = await ApiService.getCurrentQuestion(session.id);
      if (q) {
        setCurrentQuestion(q);
      }
    } catch (err) {
      console.error('Error fetching question:', err);
    }
  };

  const speakQuestionText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (session.voice_preference && session.voice_preference !== 'default') {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find((v) => v.name === session.voice_preference);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => setIsSpeakingQuestion(true);
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
  };

  // Recording controls
  const handleStartRecording = async () => {
    stopSpeaking();
    setErrorMessage(null);
    setTranscript('');
    setRecordedAudioBlob(null);
    audioChunksRef.current = [];

    // Optional real-time speech recognition for live word-by-word streaming
    const SpeechRecClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecClass) {
      try {
        const recognition = new SpeechRecClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let liveText = '';
          for (let i = 0; i < event.results.length; ++i) {
            liveText += event.results[i][0].transcript;
          }
          if (liveText.trim()) {
            setTranscript(liveText.trim());
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        speechRecogRef.current = recognition;
      } catch (recErr) {
        console.warn('Browser SpeechRecognition init notice:', recErr);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop hardware microphone stream tracks immediately
        stream.getTracks().forEach((track) => track.stop());

        // Stop live speech recognition
        if (speechRecogRef.current) {
          try {
            speechRecogRef.current.stop();
          } catch {}
          speechRecogRef.current = null;
        }

        const rawBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        // Convert browser WebM/Opus into standard 16kHz mono 16-bit PCM WAV
        setIsTranscribing(true);
        try {
          const wavBlob = await convertBlobToWav(rawBlob, 16000);
          setRecordedAudioBlob(wavBlob);
          await transcribeRecordedAudio(wavBlob);
        } catch (convErr: any) {
          console.warn('Audio conversion warning:', convErr);
          setRecordedAudioBlob(rawBlob);
          await transcribeRecordedAudio(rawBlob);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('Could not access microphone. Please ensure microphone permissions are granted in your browser.');
    }
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (speechRecogRef.current) {
      try {
        speechRecogRef.current.stop();
      } catch {}
      speechRecogRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetryRecording = () => {
    handleStopRecording();
    setRecordedAudioBlob(null);
    setTranscript('');
    setRecordDuration(0);
    setErrorMessage(null);
  };

  const transcribeRecordedAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const res = await ApiService.transcribeAudio(blob);
      const whisperText = (res.transcript || '').trim();
      setTranscript((prev) => {
        // If live transcript was empty or Whisper provided a complete transcript, update it
        if (!prev.trim() || (whisperText.length > 5 && whisperText.length >= prev.length * 0.7)) {
          return whisperText || prev;
        }
        return prev;
      });
    } catch (err: any) {
      console.warn('Transcription warning:', err);
      setTranscript((prev) => {
        if (!prev.trim()) {
          const detailMsg = err?.message || 'Speech transcription encountered a temporary delay.';
          setErrorMessage(
            `${detailMsg} You can also type or edit your answer transcript manually in the box below.`
          );
        }
        return prev;
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    const cleanAnswer = transcript.trim();
    if (cleanAnswer.length < 5) {
      setErrorMessage('Answer is too short (minimum 5 characters). Please record or type a complete response.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let res: AnswerResponseData;
      if (recordedAudioBlob) {
        // Submit audio recording directly
        res = await ApiService.submitAnswerAudio(
          session.id,
          currentQuestion.id,
          recordedAudioBlob,
          isEditingTranscript ? cleanAnswer : undefined
        );
      } else {
        // Submit text transcript
        res = await ApiService.submitAnswerText(session.id, currentQuestion.id, cleanAnswer);
      }

      // Reset turn recording states
      setTranscript('');
      setRecordedAudioBlob(null);
      setRecordDuration(0);
      setIsEditingTranscript(false);

      if (res.next_action === 'follow_up' && res.follow_up_question) {
        setLatestFollowUpMessage(res.message);
        setCurrentQuestion(res.follow_up_question);
      } else if (res.next_action === 'next_stage' && res.next_question) {
        setLatestFollowUpMessage(null);
        setCurrentQuestion(res.next_question);
        // Refresh session stage info
        const updatedSession = await ApiService.getSession(session.id);
        onSessionUpdate(updatedSession);
      } else if (res.next_action === 'completed') {
        // Finished interview!
        onSessionFinish();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (isPaused) {
        await ApiService.resumeSession(session.id);
        setIsPaused(false);
      } else {
        await ApiService.pauseSession(session.id);
        stopSpeaking();
        if (isRecording) handleStopRecording();
        setIsPaused(true);
      }
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  const handleEndInterviewEarly = async () => {
    stopSpeaking();
    if (isRecording) handleStopRecording();
    const confirmed = window.confirm('Are you sure you want to conclude the interview and view your assessment report now?');
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const res = await ApiService.endSession(session.id);
      onSessionFinish(res.report_id);
    } catch (err) {
      console.error('Failed to end interview:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const targetDurationSec = (session.duration_minutes || 10) * 60;
  const timeRemainingSec = Math.max(0, targetDurationSec - sessionElapsedSeconds);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-700 px-5 py-3 mb-4 shadow-md flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-cyan-600 flex items-center justify-center text-white">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">{session.track_name}</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 bg-slate-800 text-cyan-300 border border-slate-700">
                {session.difficulty}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Stage {session.current_stage_index + 1} of {session.total_stages || 5}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-slate-850 px-2.5 py-1 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Time Left: {formatTimer(timeRemainingSec)}</span>
          </div>

          <button
            onClick={handlePauseToggle}
            className="p-1.5 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndInterviewEarly}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-200 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End & View Report</span>
          </button>
        </div>
      </div>

      {/* Paused Banner */}
      {isPaused && (
        <div className="mb-4 p-4 bg-amber-950/70 border border-amber-700 text-amber-200 text-xs flex items-center justify-between">
          <span>Interview is currently paused. Timers and question flow are suspended.</span>
          <button
            onClick={handlePauseToggle}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase"
          >
            Resume Interview
          </button>
        </div>
      )}

      {/* Follow-Up Alert Banner */}
      {latestFollowUpMessage && (
        <div className="mb-4 p-3.5 bg-cyan-950/70 border border-cyan-700 text-cyan-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] block text-cyan-300">
              Adaptive Follow-Up Question
            </span>
            <p className="mt-0.5 leading-relaxed">{latestFollowUpMessage}</p>
          </div>
        </div>
      )}

      {/* Main Room Card */}
      <div className="bg-slate-900 border border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-800">
        {/* Section 1: AI Interviewer */}
        <div className="p-6 bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                AI Interviewer {currentQuestion?.question_type === 'follow_up' ? '(Clarification Probe)' : ''}
              </span>
            </div>
            {isSpeakingQuestion && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono animate-pulse">
                <Volume2 className="w-4 h-4" />
                <span>Interviewer Speaking...</span>
              </div>
            )}
          </div>

          <div className="bg-slate-850 border border-slate-750 p-5 rounded-none mb-4 relative">
            <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
              "{currentQuestion?.question_text || 'Preparing your interview question...'}"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => currentQuestion && speakQuestionText(currentQuestion.question_text)}
              disabled={isSpeakingQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Replay Question</span>
            </button>
            {isSpeakingQuestion && (
              <button
                onClick={stopSpeaking}
                className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs border border-transparent hover:border-slate-700"
              >
                Mute Audio
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Candidate Spoken Response Console */}
        <div className="p-6 bg-slate-850/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Candidate Spoken Response
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Duration:</span>
              <span className={`font-bold ${isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                {formatTimer(recordDuration)}
              </span>
            </div>
          </div>

          {/* Central Recording Indicator & Sound Wave */}
          <div className="border border-slate-750 bg-slate-900 p-6 text-center mb-5 flex flex-col items-center justify-center min-h-[140px]">
            {isRecording ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse mx-auto">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-widest">
                    Recording Live Voice...
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Speak your answer clearly. When finished, press "Stop Recording".
                  </p>
                </div>
              </div>
            ) : isTranscribing ? (
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Whisper Transcribing Audio & Extracting Speech Metrics...
                </span>
              </div>
            ) : recordedAudioBlob ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Audio Captured ({recordDuration}s)
                </span>
                <p className="text-[11px] text-slate-400">
                  Review the transcript preview below before submitting.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-slate-400">
                <Mic className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs">Press "Start Answer" to speak your response</p>
              </div>
            )}
          </div>

          {/* Spoken Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={isTranscribing || isSubmitting || isPaused}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
              >
                <Mic className="w-4 h-4" />
                <span>{recordedAudioBlob ? 'Re-Record Answer' : 'Start Spoken Answer'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
              >
                <Square className="w-4 h-4" />
                <span>Stop Recording</span>
              </button>
            )}

            {recordedAudioBlob && !isRecording && (
              <button
                onClick={handleRetryRecording}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Audio</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Transcript Preview & Submission */}
        <div className="p-6 bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Transcript Preview
              </span>
              {isEditingTranscript && (
                <span className="text-[10px] text-amber-400 font-mono">(Transcript Editing Enabled)</span>
              )}
            </div>
            <button
              onClick={() => setIsEditingTranscript(!isEditingTranscript)}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingTranscript ? 'Done Editing' : 'Edit Transcript'}</span>
            </button>
          </div>

          <div className="mb-4">
            {isEditingTranscript ? (
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                placeholder="Type or edit your response here..."
                className="w-full bg-slate-850 border border-slate-700 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden"
              />
            ) : (
              <div className="bg-slate-850 border border-slate-750 p-3 min-h-[75px] text-xs text-slate-200">
                {transcript ? (
                  <p className="leading-relaxed">"{transcript}"</p>
                ) : (
                  <p className="text-slate-500 italic">
                    Your speech transcript will appear here after recording...
                  </p>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400">
              {transcript.trim().split(/\s+/).filter(Boolean).length} words
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || isRecording || isTranscribing || transcript.trim().length < 5}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
