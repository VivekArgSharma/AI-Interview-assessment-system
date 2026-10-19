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
  Bot,
  Radio,
  Clock,
  Video,
  VideoOff,
  Code,
  Terminal,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  XCircle,
  Shield,
  HelpCircle
} from 'lucide-react';
import {
  InterviewSessionData,
  QuestionData,
  AnswerResponseData,
  CodeRunResult,
  PersonaChatResult
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
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);

  // Video state (PRD D10 - optional video toggle)
  const [videoEnabled, setVideoEnabled] = useState<boolean>(session.video_enabled !== false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Scenario Workbench state (S1/S2/S3 & N1/N2/N3)
  const scenarioType = session.scenario_id || (session.track_id === 'bug_fixing' ? 'S1' : 'N1');
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'voice' | 'scenario'>('voice');
  
  // Tech Scenario S1 Code & Test State
  const [codeContent, setCodeContent] = useState<string>(
    "def process_batch(records, http_client, max_retries=3):\n" +
    "    # FIX: Use idempotent set accumulator and reset per attempt\n" +
    "    processed = set()\n" +
    "    for attempt in range(max_retries):\n" +
    "        try:\n" +
    "            for item in records:\n" +
    "                http_client.post('/reconcile', json=item)\n" +
    "                processed.add(item['id'])\n" +
    "            return {'status': 'success', 'count': len(processed), 'ids': list(processed)}\n" +
    "        except ConnectionError:\n" +
    "            if attempt == max_retries - 1: raise\n" +
    "    return {'status': 'failed'}\n"
  );
  const [codeRunResult, setCodeRunResult] = useState<CodeRunResult | null>(null);
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);

  // Non-Tech Persona Chat State (N1, N2, N3)
  const [personaPatience, setPersonaPatience] = useState<number>(100);
  const [personaMood, setPersonaMood] = useState<string>('Frustrated & Impatient');
  const [personaChatHistory, setPersonaChatHistory] = useState<Array<{ sender: string; text: string }>>([
    {
      sender: 'Marcus Vance (Customer)',
      text: "I was promised my $450 refund three weeks ago! Every time I call, your reps recite policy. What are you personally going to do right now?!"
    }
  ]);
  const [personaInput, setPersonaInput] = useState<string>('');
  const [isSendingPersonaChat, setIsSendingPersonaChat] = useState<boolean>(false);

  // Teammates Chat State for S3
  const [teammateMessages, setTeammateMessages] = useState<Array<{ sender: string; role: string; text: string }>>([
    { sender: 'Alex', role: 'On-call Lead', text: "Latency spiked to 3200ms right after the migration. I want to roll back the whole release right now." },
    { sender: 'Sarah', role: 'Product Manager', text: "Checkout timeouts are hitting VIP tiers. Can we post an external incident status update?" },
    { sender: 'Leo', role: 'Junior Engineer', text: "I am seeing dozens of idle-in-transaction connections on postgres. Should we kill them?" }
  ]);
  const [teammateInput, setTeammateInput] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const speechRecogRef = useRef<any>(null);

  // Initialize camera preview if enabled
  useEffect(() => {
    if (videoEnabled) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          console.warn("Camera not accessible or permission denied");
        });
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
      }
    }
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoEnabled]);

  // Anti-cheating focus change tracking (PRD Section 14)
  useEffect(() => {
    const handleBlur = () => {
      ApiService.logScenarioEvent(session.id, 'tab_blur', { note: 'Candidate switched window tab' });
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [session.id]);

  // Load current question if not loaded
  useEffect(() => {
    if (!currentQuestion) {
      loadCurrentQuestion();
    }
  }, [session.id]);

  // Session timer
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
      if (q) setCurrentQuestion(q);
    } catch (err) {
      console.error('Error fetching question:', err);
    }
  };

  const speakQuestionText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeakingQuestion(true);
    utterance.onend = () => setIsSpeakingQuestion(false);
    utterance.onerror = () => setIsSpeakingQuestion(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
  };

  // Turn-taking recording controls
  const handleStartRecording = async () => {
    stopSpeaking();
    setErrorMessage(null);
    setRecordedAudioBlob(null);
    setTranscript('');
    audioChunksRef.current = [];

    // Web Speech API for immediate live transcription
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
        recognition.start();
        speechRecogRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition warning:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const wavBlob = await convertBlobToWav(webmBlob);
          setRecordedAudioBlob(wavBlob);
          await transcribeRecordedAudio(wavBlob);
        } catch {
          setRecordedAudioBlob(webmBlob);
          await transcribeRecordedAudio(webmBlob);
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => setRecordDuration((prev) => prev + 1), 1000);
    } catch {
      setErrorMessage('Could not access microphone. Ensure permissions are granted in browser.');
    }
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (speechRecogRef.current) {
      try { speechRecogRef.current.stop(); } catch {}
      speechRecogRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeRecordedAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const res = await ApiService.transcribeAudio(blob);
      const whisperText = (res.transcript || '').trim();
      setTranscript((prev) => {
        if (!prev.trim() || (whisperText.length > 5 && whisperText.length >= prev.length * 0.7)) {
          return whisperText || prev;
        }
        return prev;
      });
    } catch (err: any) {
      console.warn('Whisper fallback note:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    const cleanAnswer = transcript.trim();
    if (cleanAnswer.length < 5) {
      setErrorMessage('Answer is too short (minimum 5 characters). Speak or type your response.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let res: AnswerResponseData;
      if (recordedAudioBlob) {
        res = await ApiService.submitAnswerAudio(
          session.id,
          currentQuestion.id,
          recordedAudioBlob,
          isEditingTranscript ? cleanAnswer : undefined
        );
      } else {
        res = await ApiService.submitAnswerText(session.id, currentQuestion.id, cleanAnswer);
      }

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
        const updated = await ApiService.getSession(session.id);
        onSessionUpdate(updated);
      } else if (res.next_action === 'completed') {
        onSessionFinish();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run S1 code tests in sandbox
  const handleRunCode = async () => {
    setIsRunningCode(true);
    try {
      const res = await ApiService.runScenarioCode(session.id, 'S1', codeContent);
      setCodeRunResult(res);
    } catch {
      setErrorMessage('Sandbox code execution failed.');
    } finally {
      setIsRunningCode(false);
    }
  };

  // Send Persona Chat message
  const handleSendPersonaChat = async () => {
    if (!personaInput.trim()) return;
    const userMsg = personaInput.trim();
    setPersonaInput('');
    setPersonaChatHistory((prev) => [...prev, { sender: 'You (Candidate)', text: userMsg }]);

    setIsSendingPersonaChat(true);
    try {
      const res: PersonaChatResult = await ApiService.chatPersona(session.id, {
        scenario_id: 'N1',
        candidate_message: userMsg,
        current_patience: personaPatience
      });
      setPersonaPatience(res.patience);
      setPersonaMood(res.mood);
      setPersonaChatHistory((prev) => [...prev, { sender: `${res.persona_name} (Customer)`, text: res.reply }]);
    } catch {
      setErrorMessage('Failed to send message to persona.');
    } finally {
      setIsSendingPersonaChat(false);
    }
  };

  // Send Teammate message (S3)
  const handleSendTeammateChat = () => {
    if (!teammateInput.trim()) return;
    const msg = teammateInput.trim();
    setTeammateInput('');
    setTeammateMessages((prev) => [...prev, { sender: 'You', role: 'Incident Commander', text: msg }]);
    setTimeout(() => {
      setTeammateMessages((prev) => [
        ...prev,
        { sender: 'Alex', role: 'On-call Lead', text: "Acknowledged. Let's isolate the read replicas and observe metrics before triggering rollback." }
      ]);
    }, 1200);
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
      console.error(err);
    }
  };

  const handleEndInterviewEarly = async () => {
    stopSpeaking();
    if (isRecording) handleStopRecording();
    if (!window.confirm('Conclude interview and generate your score reports now?')) return;
    try {
      setIsSubmitting(true);
      const res = await ApiService.endSession(session.id);
      onSessionFinish(res.report_id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const targetDurationSec = (session.duration_minutes || 15) * 60;
  const timeRemainingSec = Math.max(0, targetDurationSec - sessionElapsedSeconds);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Radio className="w-4 h-4 animate-pulse text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{session.track_name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {session.difficulty}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {scenarioType} Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stage {session.current_stage_index + 1} of {session.total_stages || 5} • Turn Adaptive Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Time Left: {formatTimer(timeRemainingSec)}</span>
          </div>

          <button
            onClick={handlePauseToggle}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              videoEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
            title={videoEnabled ? 'Disable Camera (Privacy Mode)' : 'Enable Camera'}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndInterviewEarly}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish & View Report</span>
          </button>
        </div>
      </div>

      {/* Paused Banner */}
      {isPaused && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <span className="font-medium">Interview paused. Timers and question turns are temporarily frozen.</span>
          <button
            onClick={handlePauseToggle}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
          >
            Resume Interview
          </button>
        </div>
      )}

      {/* Adaptive Probe Alert Banner (PRD D4) */}
      {latestFollowUpMessage && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 block">
              Uncertainty-Driven Follow-Up Probe (D4)
            </span>
            <p className="mt-0.5 text-indigo-950 font-medium leading-relaxed">{latestFollowUpMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Interviewer + Console / Scenario Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: AI Interviewer & Camera Preview */}
        <div className="lg:col-span-5 space-y-5">
          {/* AI Voice Avatar Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">AI Interviewer</span>
              </div>
              {isSpeakingQuestion && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  <span>Speaking...</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl mb-4 relative min-h-[90px] flex items-center">
              <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                "{currentQuestion?.question_text || 'Preparing question...'}"
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => currentQuestion && speakQuestionText(currentQuestion.question_text)}
                disabled={isSpeakingQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Repeat Question</span>
              </button>
              {isSpeakingQuestion && (
                <button
                  onClick={stopSpeaking}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Barge-in / Stop Voice
                </button>
              )}
            </div>
          </div>

          {/* Camera Preview Card (Privacy Mode supported) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-slate-500" />
                Video Feed (Descriptive Only)
              </span>
              <span className="text-[10px] text-slate-400">Weight: 0.0</span>
            </div>

            <div className="h-44 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
              {videoEnabled ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Framing: 94% Stable
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <VideoOff className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-600">Video Disabled</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Privacy Mode active (No video recorded)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Workspace (Voice Response vs Scenario Workbench) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveWorkbenchTab('voice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeWorkbenchTab === 'voice'
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Answer Console</span>
              </button>

              <button
                onClick={() => setActiveWorkbenchTab('scenario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeWorkbenchTab === 'scenario'
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Scenario Workbench ({scenarioType})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Voice Response Console */}
          {activeWorkbenchTab === 'voice' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Candidate Response Stream
                </span>
                {isRecording && (
                  <span className="text-xs font-mono font-bold text-rose-600 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    Recording ({formatTimer(recordDuration)})
                  </span>
                )}
              </div>

              {/* Transcript Display Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[140px] max-h-[220px] overflow-y-auto">
                {isEditingTranscript ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full h-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-slate-900 resize-none font-sans"
                    rows={4}
                    placeholder="Type or edit your response..."
                  />
                ) : (
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {transcript || (
                      <span className="text-slate-400 italic">
                        Click "Start Recording" or type your spoken response. Real-time Whisper streaming will transcribe your audio.
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      disabled={isPaused || isSubmitting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50 transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Speaking</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs animate-pulse transition-all"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop & Review</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium"
                  >
                    {isEditingTranscript ? 'Done Editing' : 'Edit Text'}
                  </button>
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={isRecording || isSubmitting || transcript.trim().length < 5}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs disabled:opacity-40 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scoring Multimodal Features...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Scenario Workbench (S1 Code Fix, S3 Teammates, N1 Persona) */}
          {activeWorkbenchTab === 'scenario' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Tech S1 / S2 Scenario View */}
              {(scenarioType === 'S1' || scenarioType === 'S2') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase">
                        S1: Failing Service Sandbox (Code Fix)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Fix the unhandled retry accumulator duplication bug and verify sandboxed tests pass.
                      </p>
                    </div>
                    <button
                      onClick={handleRunCode}
                      disabled={isRunningCode}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isRunningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>Run Sandboxed Tests</span>
                    </button>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden font-mono text-xs mb-3">
                    <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold text-[11px] flex justify-between">
                      <span>worker_reconciliation.py</span>
                      <span className="text-slate-400">Python 3.10 sandbox</span>
                    </div>
                    <textarea
                      value={codeContent}
                      onChange={(e) => setCodeContent(e.target.value)}
                      rows={9}
                      className="w-full p-3 bg-slate-900 text-emerald-300 font-mono text-xs focus:outline-hidden leading-relaxed resize-none"
                    />
                  </div>

                  {codeRunResult && (
                    <div className={`p-3.5 rounded-xl border text-xs ${
                      codeRunResult.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className="flex items-center gap-1.5">
                          {codeRunResult.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                          {codeRunResult.passed ? 'All Sandboxed Tests Passed (3/3)' : 'Test Assertions Failed'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{codeRunResult.execution_time_ms}ms</span>
                      </div>
                      <pre className="text-[11px] font-mono bg-white/70 p-2 rounded-lg mt-1 whitespace-pre-wrap">
                        {codeRunResult.stdout}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Non-Tech N1 Persona Dialogue View */}
              {scenarioType === 'N1' && (
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase">
                        N1: Angry Customer Stakeholder Simulation
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        De-escalate client frustration empathetically before jumping to rigid company policy.
                      </p>
                    </div>
                    {/* Emotional Patience Bar */}
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Patience: {personaPatience}% ({personaMood})
                      </span>
                      <div className="w-28 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            personaPatience > 60 ? 'bg-emerald-500' : personaPatience > 30 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${personaPatience}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chat Message Scroll */}
                  <div className="h-56 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 mb-3 text-xs">
                    {personaChatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl max-w-[85%] ${
                          msg.sender.includes('You')
                            ? 'bg-indigo-600 text-white ml-auto'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className={`text-[10px] font-bold block mb-0.5 ${msg.sender.includes('You') ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {msg.sender}
                        </span>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Input form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={personaInput}
                      onChange={(e) => setPersonaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendPersonaChat()}
                      placeholder="Type your de-escalation statement..."
                      className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSendPersonaChat}
                      disabled={isSendingPersonaChat || !personaInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                    >
                      Send Turn
                    </button>
                  </div>
                </div>
              )}

              {/* S3 Incident with Teammates View */}
              {scenarioType === 'S3' && (
                <div>
                  <div className="mb-3 pb-2 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase">
                      S3: Live Incident Triage with Simulated Teammates
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Collaborate in Slack with Alex (On-call Lead), Sarah (PM), and Leo (Junior).
                    </p>
                  </div>

                  <div className="h-56 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 mb-3 text-xs">
                    {teammateMessages.map((m, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-indigo-700 text-xs">{m.sender}</span>
                          <span className="text-[10px] text-slate-400">({m.role})</span>
                        </div>
                        <p className="leading-relaxed text-slate-700">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={teammateInput}
                      onChange={(e) => setTeammateInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendTeammateChat()}
                      placeholder="Coordinate next mitigation steps..."
                      className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSendTeammateChat}
                      disabled={!teammateInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                    >
                      Broadcast
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
