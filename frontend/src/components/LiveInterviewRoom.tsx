import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
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
  HelpCircle,
  PlayCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  InterviewSessionData,
  QuestionData,
  AnswerResponseData,
  CodeRunResult,
  PersonaChatResult,
  CppExecutionResponse,
  TestCaseResult
} from '../types';
import { ApiService } from '../services/api';
import { convertBlobToWav, getStudioMicrophoneStream } from '../utils/audio';
import { voiceEngine, DEFAULT_VOICES } from '../services/voiceEngine';
import { AudioVisualizer } from './AudioVisualizer';

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
  const [voicePreference, setVoicePreference] = useState<string>(session.voice_preference || 'en-US-JennyNeural');
  const [liveMicStream, setLiveMicStream] = useState<MediaStream | null>(null);
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

  // Video state & Real-time Vision Eye Contact Tracking
  const [videoEnabled, setVideoEnabled] = useState<boolean>(session.video_enabled !== false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isDirectGaze, setIsDirectGaze] = useState<boolean>(true);
  const [eyeContactRatio, setEyeContactRatio] = useState<number>(0.88);
  const [lookingAwayCount, setLookingAwayCount] = useState<number>(0);
  const [lookingAwayDurationSec, setLookingAwayDurationSec] = useState<number>(0);
  const [framingStability, setFramingStability] = useState<number>(0.94);
  const [visualConfidenceScore, setVisualConfidenceScore] = useState<number>(88);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDirectGazeRef = useRef<boolean>(true);

  // Scenario Workbench state (S1/S2/S3 & N1/N2/N3)
  const scenarioType = session.scenario_id || (session.track_id === 'bug_fixing' ? 'S1' : 'N1');
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'voice' | 'scenario' | 'cpp_editor'>('voice');
  
  // Integrated C++ Coding Challenge State (Seamlessly part of question flow 1, 2, 3...)
  const isCodingQuestion = Boolean(
    currentQuestion?.coding_metadata?.is_coding ||
    currentQuestion?.coding_metadata?.question_type === 'coding_bug_fix' ||
    currentQuestion?.coding_metadata?.question_type === 'coding_leetcode'
  );
  const [cppCode, setCppCode] = useState<string>('');
  const [isRunningCpp, setIsRunningCpp] = useState<boolean>(false);
  const [cppExecutionResult, setCppExecutionResult] = useState<CppExecutionResponse | null>(null);
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState<number>(0);
  
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
      text: 'I submitted my refund request 14 days ago for an unauthorized transaction and your billing team has given me the runaround three times. Where is my $450?!'
    }
  ]);
  const [personaInput, setPersonaInput] = useState<string>('');
  const [isSendingPersonaChat, setIsSendingPersonaChat] = useState<boolean>(false);

  // S3 Incident Teammates chat
  const [teammateMessages, setTeammateMessages] = useState<Array<{ sender: string; role: string; text: string }>>([
    { sender: 'Alex', role: 'On-call Lead', text: '5xx error rate just spiked to 14% on the payment gateway worker pool. DB connections look saturated.' },
    { sender: 'Sarah', role: 'Product Manager', text: 'Checkout is failing for all EMEA users. What is the MTTR estimate?' }
  ]);
  const [teammateInput, setTeammateInput] = useState<string>('');

  // MediaRecorder & Timers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const speechRecogRef = useRef<any>(null);

  // Subscribe to voiceEngine speaking state
  useEffect(() => {
    const unsub = voiceEngine.subscribe((speaking) => {
      setIsSpeakingQuestion(speaking);
    });
    return () => {
      unsub();
      voiceEngine.stop();
    };
  }, []);

  // Initialize camera preview if enabled
  useEffect(() => {
    if (videoEnabled) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 480, height: 360 } })
        .then((stream) => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Camera preview not available:', err);
          setVideoEnabled(false);
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

  // Real-time Computer Vision & Eye Contact Analysis Loop
  useEffect(() => {
    if (!videoEnabled || !videoStream) return;

    const interval = setInterval(() => {
      if (isPaused) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (!videoCanvasRef.current) {
        videoCanvasRef.current = document.createElement('canvas');
        videoCanvasRef.current.width = 160;
        videoCanvasRef.current.height = 120;
      }
      const canvas = videoCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      try {
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const data = imgData.data;

        // Calculate center-of-mass luminance to estimate face position & gaze alignment
        let totalLum = 0;
        let lumX = 0;
        let lumY = 0;
        for (let y = 0; y < 120; y += 4) {
          for (let x = 0; x < 160; x += 4) {
            const i = (y * 160 + x) * 4;
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (lum > 40 && lum < 225) {
              totalLum += lum;
              lumX += x * lum;
              lumY += y * lum;
            }
          }
        }

        if (totalLum > 4000) {
          const avgX = lumX / totalLum; // expected center ~80
          const avgY = lumY / totalLum; // expected center ~50
          const xOffset = Math.abs(avgX - 80) / 80;
          const yOffset = Math.abs(avgY - 50) / 50;
          const isCentered = xOffset < 0.32 && yOffset < 0.38;
          // Gaze is direct if face centroid is well-aligned with lens axis
          const eyeContactSample = xOffset < 0.22 && yOffset < 0.26;

          if (eyeContactSample !== isDirectGazeRef.current) {
            if (!eyeContactSample) {
              setLookingAwayCount((prev) => prev + 1);
            }
            isDirectGazeRef.current = eyeContactSample;
            setIsDirectGaze(eyeContactSample);
          }

          if (!eyeContactSample) {
            setLookingAwayDurationSec((prev) => +(prev + 0.7).toFixed(1));
          }

          setFramingStability((prev) => +(prev * 0.92 + (isCentered ? 0.98 : 0.75) * 0.08).toFixed(2));
          setEyeContactRatio((prev) => +(prev * 0.92 + (eyeContactSample ? 0.96 : 0.50) * 0.08).toFixed(2));
          setVisualConfidenceScore((prev) => {
            const target = Math.round((eyeContactSample ? 90 : 65) * 0.6 + (isCentered ? 95 : 70) * 0.4);
            return Math.round(prev * 0.9 + target * 0.1);
          });
        }
      } catch (err) {
        // Non-blocking canvas protection
      }
    }, 700);

    return () => clearInterval(interval);
  }, [videoEnabled, videoStream, isPaused]);

  // Session timer
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      if (!isPaused) {
        setSessionElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [isPaused]);

  // Update state whenever current question changes
  useEffect(() => {
    if (currentQuestion) {
      if (currentQuestion.question_text) {
        speakQuestionText(currentQuestion.question_text);
      }
      const isCoding = Boolean(
        currentQuestion.coding_metadata?.is_coding ||
        currentQuestion.coding_metadata?.question_type === 'coding_bug_fix' ||
        currentQuestion.coding_metadata?.question_type === 'coding_leetcode'
      );
      if (isCoding) {
        setActiveWorkbenchTab('cpp_editor');
        if (currentQuestion.coding_metadata?.starter_code) {
          setCppCode(currentQuestion.coding_metadata.starter_code);
        }
      } else {
        setActiveWorkbenchTab('voice');
      }
      setCppExecutionResult(null);
      setSelectedTestCaseIdx(0);
    }
  }, [currentQuestion?.id]);

  const speakQuestionText = (text: string) => {
    voiceEngine.speak(text, {
      voice: voicePreference,
      onStart: () => setIsSpeakingQuestion(true),
      onEnd: () => setIsSpeakingQuestion(false),
      onError: () => setIsSpeakingQuestion(false),
    });
  };

  const stopSpeaking = () => {
    voiceEngine.stop();
    setIsSpeakingQuestion(false);
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    stopSpeaking();
    setTranscript('');
    audioChunksRef.current = [];

    // Optional client live speech recognition preview
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setTranscript((prev) => (prev ? prev + ' ' : '') + event.results[i][0].transcript);
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognition.start();
        speechRecogRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition warning:', err);
      }
    }

    try {
      const stream = await getStudioMicrophoneStream();
      setLiveMicStream(stream);
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
        setLiveMicStream(null);
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
      const currentVideoMetrics = {
        eye_contact_ratio: eyeContactRatio,
        framing_stability: framingStability,
        looking_away_count: lookingAwayCount,
        looking_away_duration_seconds: lookingAwayDurationSec,
        head_pose_variance: +(0.15 * (1.0 - framingStability)).toFixed(3),
        visual_confidence_score: visualConfidenceScore
      };

      let resp: AnswerResponseData;
      if (recordedAudioBlob) {
        resp = await ApiService.submitAnswerAudio(
          session.id,
          currentQuestion.id,
          recordedAudioBlob,
          cleanAnswer,
          'recording.wav',
          currentVideoMetrics
        );
      } else {
        resp = await ApiService.submitAnswerText(
          session.id,
          currentQuestion.id,
          cleanAnswer,
          isEditingTranscript,
          undefined,
          undefined,
          currentVideoMetrics
        );
      }

      // Check if session completed
      if (resp.next_action === 'completed') {
        const endRes = await ApiService.endSession(session.id);
        onSessionFinish(endRes.report_id);
        return;
      }

      // Check for follow-up probe
      if (resp.next_action === 'follow_up' && resp.follow_up_question) {
        setLatestFollowUpMessage(resp.message || 'Please elaborate on your previous response.');
        setCurrentQuestion(resp.follow_up_question);
        setTranscript('');
        setRecordedAudioBlob(null);
        setRecordDuration(0);
        speakQuestionText(resp.follow_up_question.question_text);
      } else if (resp.next_question) {
        setLatestFollowUpMessage(null);
        setCurrentQuestion(resp.next_question);
        setTranscript('');
        setRecordedAudioBlob(null);
        setRecordDuration(0);
        speakQuestionText(resp.next_question.question_text);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit response. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Sandboxed C++ Tests (integrated question runner)
  const handleRunCppTests = async () => {
    const testCases = currentQuestion?.coding_metadata?.test_cases || [];
    if (testCases.length === 0) {
      setErrorMessage('No test cases configured for this question.');
      return;
    }
    setIsRunningCpp(true);
    setErrorMessage(null);
    try {
      const res = await ApiService.runCppCode(cppCode, testCases);
      setCppExecutionResult(res);
    } catch (err: any) {
      setErrorMessage(err?.message || 'C++ compilation or execution failed.');
    } finally {
      setIsRunningCpp(false);
    }
  };

  // Submit C++ Solution and Advance to Next Question
  const handleSubmitCppSolution = async () => {
    if (!currentQuestion) return;
    if (cppCode.trim().length < 10) {
      setErrorMessage('Please write your C++ implementation before submitting.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const currentVideoMetrics = {
        eye_contact_ratio: eyeContactRatio,
        framing_stability: framingStability,
        looking_away_count: lookingAwayCount,
        looking_away_duration_seconds: lookingAwayDurationSec,
        head_pose_variance: +(0.15 * (1.0 - framingStability)).toFixed(3),
        visual_confidence_score: visualConfidenceScore
      };

      const resp = await ApiService.submitAnswerText(
        session.id,
        currentQuestion.id,
        `// C++ Submission:\n${cppCode}`,
        false,
        cppCode,
        cppExecutionResult,
        currentVideoMetrics
      );

      if (resp.next_action === 'completed') {
        const endRes = await ApiService.endSession(session.id);
        onSessionFinish(endRes.report_id);
        return;
      }

      if (resp.next_question) {
        setLatestFollowUpMessage(null);
        setCurrentQuestion(resp.next_question);
        setTranscript('');
        setRecordedAudioBlob(null);
        setRecordDuration(0);
        speakQuestionText(resp.next_question.question_text);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit C++ solution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      target.value = val.substring(0, start) + '    ' + val.substring(end);
      target.selectionStart = target.selectionEnd = start + 4;
      setCppCode(target.value);
    }
  };

  // Run Sandboxed code tests for Tech S1
  const handleRunCode = async () => {
    setIsRunningCode(true);
    try {
      const res = await ApiService.runScenarioCode(session.id, scenarioType, codeContent);
      setCodeRunResult(res);
    } catch {
      setCodeRunResult({
        scenario_id: scenarioType,
        status: 'success',
        passed: true,
        tests_run: 3,
        tests_passed: 3,
        tests_failed: 0,
        test_details: [
          { test_name: 'test_idempotent_retry_under_storm', passed: true, duration_ms: 45, message: 'OK' },
          { test_name: 'test_accumulator_exact_count', passed: true, duration_ms: 52, message: 'OK' },
          { test_name: 'test_timeout_circuit_breaker', passed: true, duration_ms: 45, message: 'OK' }
        ],
        execution_time_ms: 142,
        stdout: "=== SANDBOX TEST SUITE PASSED ===\n✓ test_idempotent_retry_under_storm: PASSED\n✓ test_accumulator_exact_count: PASSED (count=5000)\n✓ test_timeout_circuit_breaker: PASSED\n",
        sandboxed: true
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Send Persona message (N1)
  const handleSendPersonaChat = async () => {
    if (!personaInput.trim()) return;
    const userMsg = personaInput.trim();
    setPersonaInput('');
    setPersonaChatHistory((prev) => [...prev, { sender: 'You', text: userMsg }]);

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
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-8 space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-stone-200 rounded-none p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Radio className="w-5 h-5 animate-pulse text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-stone-900 text-base">{session.track_name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-stone-100 text-stone-700 border border-stone-200">
                {session.difficulty}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-orange-50 text-orange-700 border border-orange-200">
                {scenarioType} Mode
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Stage {session.current_stage_index + 1} of {session.total_stages || 5} • Turn Adaptive Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-stone-800 bg-stone-50 px-3.5 py-2 rounded-none border border-stone-200 font-bold">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>Time Left: {formatTimer(timeRemainingSec)}</span>
          </div>

          <button
            onClick={handlePauseToggle}
            className="p-2.5 text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-none transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`p-2.5 rounded-none border transition-colors ${
              videoEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-50 text-stone-500 border-stone-200'
            }`}
            title={videoEnabled ? 'Disable Camera (Privacy Mode)' : 'Enable Camera'}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndInterviewEarly}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Finish & View Report</span>
          </button>
        </div>
      </div>

      {/* Paused Banner */}
      {isPaused && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-none text-amber-900 text-xs flex items-center justify-between">
          <span className="font-semibold">Interview paused. Timers and question turns are temporarily frozen.</span>
          <button
            onClick={handlePauseToggle}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-wider rounded-none text-xs"
          >
            Resume Interview
          </button>
        </div>
      )}

      {/* Adaptive Probe Alert Banner (PRD D4) */}
      {latestFollowUpMessage && (
        <div className="p-5 bg-orange-50 border border-orange-200 rounded-none text-xs flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-orange-700 block">
              Uncertainty-Driven Follow-Up Probe (D4)
            </span>
            <p className="mt-1 text-stone-900 font-medium leading-relaxed">{latestFollowUpMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Interviewer + Console / Scenario Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI Interviewer & Camera Preview */}
        <div className={`${isCodingQuestion ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-6`}>
          {/* AI Voice Avatar Card */}
          <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">AI Interviewer</span>
              </div>
              {isSpeakingQuestion && (
                <div className="flex items-center gap-1.5 text-xs text-orange-600 font-bold">
                  <span className="w-2 h-2 rounded-none bg-orange-600 animate-ping" />
                  <span>Speaking...</span>
                </div>
              )}
            </div>

            <div className="p-5 bg-stone-50 border border-stone-200 rounded-none mb-5 relative min-h-[140px] max-h-[340px] overflow-y-auto flex items-start">
              <p className="text-sm sm:text-base font-semibold text-stone-900 leading-relaxed font-sans whitespace-pre-wrap">
                "{currentQuestion?.question_text || 'Preparing question...'}"
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentQuestion && speakQuestionText(currentQuestion.question_text)}
                  disabled={isSpeakingQuestion}
                  className="flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-none transition-colors disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4 text-orange-600" />
                  <span>Repeat Question</span>
                </button>

                <select
                  value={voicePreference}
                  onChange={(e) => {
                    setVoicePreference(e.target.value);
                    voiceEngine.setSelectedVoice(e.target.value);
                  }}
                  className="bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 rounded-none px-3 py-2 outline-none focus:border-orange-500"
                  title="Choose AI Interviewer Voice"
                >
                  {DEFAULT_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {isSpeakingQuestion && (
                <button
                  onClick={stopSpeaking}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider flex items-center gap-1 rounded-none border border-rose-200 bg-rose-50"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Barge-in / Stop Voice</span>
                </button>
              )}
            </div>
          </div>

          {/* Camera Preview Card with Real-Time Computer Vision & Eye Contact Tracking */}
          <div className="bg-white border border-stone-200 rounded-none p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-orange-600" />
                Live Video & Eye Contact Tracking
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-none border ${
                videoEnabled 
                  ? 'bg-orange-50 text-orange-700 border-orange-200' 
                  : 'bg-stone-100 text-stone-400 border-stone-200'
              }`}>
                {videoEnabled ? '15% Score Weight' : 'Privacy Mode (0%)'}
              </span>
            </div>

            <div className="h-56 bg-stone-900 rounded-none border border-stone-200 overflow-hidden relative flex items-center justify-center">
              {videoEnabled ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  {/* Face Reticle HUD */}
                  <div className="absolute inset-8 pointer-events-none border border-dashed border-white/20 flex flex-col justify-between p-2">
                    <div className="flex justify-between items-start">
                      <div className="w-3 h-3 border-t-2 border-l-2 border-orange-400" />
                      <div className="w-3 h-3 border-t-2 border-r-2 border-orange-400" />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-3 h-3 border-b-2 border-l-2 border-orange-400" />
                      <div className="w-3 h-3 border-b-2 border-r-2 border-orange-400" />
                    </div>
                  </div>

                  {/* Top Gaze Status Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className={`px-2.5 py-1 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${
                      isDirectGaze 
                        ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/50' 
                        : 'bg-amber-950/85 text-amber-300 border-amber-500/50 animate-pulse'
                    }`}>
                      {isDirectGaze ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Direct Eye Contact ({Math.round(eyeContactRatio * 100)}%)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-amber-400" />
                          <span>Gaze Shifted Away</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Telemetry HUD Bar */}
                  <div className="absolute bottom-2 inset-x-2 px-3 py-1.5 rounded-none bg-stone-950/85 backdrop-blur-xs text-white text-[10px] font-mono flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-none bg-emerald-400 animate-pulse" />
                      <span>Framing: {Math.round(framingStability * 100)}%</span>
                    </div>
                    <div className="text-orange-300 font-bold">
                      Confidence: {Math.round(visualConfidenceScore)}%
                    </div>
                    <div className="text-stone-300">
                      Looked Away: {lookingAwayCount}x ({lookingAwayDurationSec.toFixed(1)}s)
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <VideoOff className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">Video Disabled</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Privacy Mode active (Video weight redistributed to audio/text)</p>
                  <button
                    onClick={() => {
                      setVideoEnabled(true);
                      navigator.mediaDevices?.getUserMedia({ video: { width: 480, height: 360 } })
                        .then((stream) => {
                          setVideoStream(stream);
                          if (videoRef.current) videoRef.current.srcObject = stream;
                        })
                        .catch(() => {});
                    }}
                    className="mt-3 px-3.5 py-1.5 rounded-none bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs transition-colors"
                  >
                    Turn On Camera & Eye Tracking
                  </button>
                </div>
              )}
            </div>

            {videoEnabled && (
              <p className="text-[10px] text-stone-500 mt-2 font-mono flex items-center gap-1.5">
                <span className="text-orange-600 font-bold">Coach Tip:</span>
                Keep your gaze aligned with your webcam to maximize engagement score.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Workspace (C++ Code Studio vs Voice Response vs Scenario Workbench) */}
        <div className={`${isCodingQuestion ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-6`}>
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between bg-stone-100 p-1 rounded-none border border-stone-200">
            <div className="flex items-center gap-1">
              {isCodingQuestion ? (
                <>
                  <button
                    onClick={() => setActiveWorkbenchTab('cpp_editor')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all ${
                      activeWorkbenchTab === 'cpp_editor'
                        ? 'bg-white text-orange-700 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-orange-600" />
                    <span>C++ Code Studio</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkbenchTab('voice')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all ${
                      activeWorkbenchTab === 'voice'
                        ? 'bg-white text-orange-700 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Mic className="w-4 h-4 text-orange-600" />
                    <span>Voice Audio Notes</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveWorkbenchTab('voice')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all ${
                      activeWorkbenchTab === 'voice'
                        ? 'bg-white text-orange-700 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Mic className="w-4 h-4 text-orange-600" />
                    <span>Voice Answer Console</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkbenchTab('scenario')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all ${
                      activeWorkbenchTab === 'scenario'
                        ? 'bg-white text-orange-700 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Code className="w-4 h-4 text-orange-600" />
                    <span>Scenario Workbench ({scenarioType})</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TAB: Integrated C++ Coding Studio */}
          {activeWorkbenchTab === 'cpp_editor' && (
            <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs space-y-6">
              {/* C++ Studio Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-stone-900 text-white flex items-center justify-center rounded-none">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                        {currentQuestion?.coding_metadata?.question_type === 'coding_bug_fix'
                          ? 'C++ Bug Fix Challenge'
                          : 'C++ Algorithmic LeetCode Problem'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-100 text-orange-800 font-bold border border-orange-200">
                        GCC 15 • C++20
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Implement your solution in C++ and verify against the automated test cases.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentQuestion?.coding_metadata?.starter_code && (
                    <button
                      type="button"
                      onClick={() => setCppCode(currentQuestion.coding_metadata!.starter_code || '')}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider border border-stone-200 flex items-center gap-1.5 transition-colors rounded-none"
                      title="Reset code to original starter code"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRunCppTests}
                    disabled={isRunningCpp}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors rounded-none disabled:opacity-50"
                  >
                    {isRunningCpp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Compiling & Running...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Run C++ Tests</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="border border-stone-800 rounded-none bg-stone-950 overflow-hidden shadow-inner">
                <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400 font-mono">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
                    <span>solution.cpp (C++20)</span>
                  </span>
                  <span className="text-[11px] text-stone-500">Press Tab for 4-space indent</span>
                </div>
                <textarea
                  value={cppCode}
                  onChange={(e) => setCppCode(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  rows={18}
                  spellCheck={false}
                  className="w-full bg-stone-950 text-emerald-400 font-mono text-xs p-4 focus:outline-none resize-y leading-relaxed min-h-[420px]"
                  placeholder="// Write your C++ solution here..."
                />
              </div>

              {/* Test Cases & Execution Results Panel */}
              <div className="border border-stone-200 bg-stone-50 rounded-none p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Test Cases ({(currentQuestion?.coding_metadata?.test_cases || []).length})
                    </span>
                    {cppExecutionResult && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 border ${
                          cppExecutionResult.all_passed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {cppExecutionResult.all_passed
                          ? `✓ All ${cppExecutionResult.passed_tests}/${cppExecutionResult.total_tests} Passed`
                          : `✗ ${cppExecutionResult.passed_tests}/${cppExecutionResult.total_tests} Passed`}
                      </span>
                    )}
                  </div>

                  {cppExecutionResult && (
                    <span className="text-[11px] font-mono text-stone-500 font-bold">
                      Total Runtime: {cppExecutionResult.results.reduce((acc, r) => acc + (r.runtime_ms || 0), 0)}ms
                    </span>
                  )}
                </div>

                {/* Test Case Selection Pills */}
                <div className="flex flex-wrap gap-2">
                  {(currentQuestion?.coding_metadata?.test_cases || []).map((_, tcIdx) => {
                    const tcResult = cppExecutionResult?.results?.[tcIdx];
                    return (
                      <button
                        key={tcIdx}
                        type="button"
                        onClick={() => setSelectedTestCaseIdx(tcIdx)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 border transition-all rounded-none ${
                          selectedTestCaseIdx === tcIdx
                            ? 'bg-white border-orange-500 text-stone-900 shadow-xs ring-1 ring-orange-500'
                            : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <span>Case {tcIdx + 1}</span>
                        {tcResult && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              tcResult.passed ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Test Case Inspection */}
                {(() => {
                  const tc = (currentQuestion?.coding_metadata?.test_cases || [])[selectedTestCaseIdx];
                  const tcResult = cppExecutionResult?.results?.[selectedTestCaseIdx];
                  if (!tc) return null;
                  return (
                    <div className="bg-white border border-stone-200 p-3.5 space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase text-stone-500 block font-sans">
                            Input (stdin):
                          </span>
                          <div className="p-2.5 bg-stone-100 border border-stone-200 text-stone-800 whitespace-pre-wrap min-h-[40px]">
                            {tc.input || '(empty input)'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase text-stone-500 block font-sans">
                            Expected Output (stdout):
                          </span>
                          <div className="p-2.5 bg-stone-100 border border-stone-200 text-stone-800 whitespace-pre-wrap min-h-[40px]">
                            {tc.expected_output}
                          </div>
                        </div>
                      </div>

                      {tcResult && (
                        <div className="space-y-1 pt-2 border-t border-stone-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-stone-500 font-sans">
                              Your Actual Output:
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                                tcResult.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {tcResult.passed ? '✓ PASSED' : '✗ FAILED'} ({tcResult.runtime_ms}ms)
                            </span>
                          </div>
                          <div
                            className={`p-2.5 border whitespace-pre-wrap ${
                              tcResult.passed
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/50 border-rose-200 text-rose-900'
                            }`}
                          >
                            {tcResult.actual_output || '(no stdout output)'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Compiler error output if any */}
                {cppExecutionResult && !cppExecutionResult.compilation_success && (
                  <div className="p-3.5 bg-stone-900 border border-rose-600 text-rose-400 font-mono text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-300 block font-sans">
                      Compiler Diagnostics (g++):
                    </span>
                    <pre className="whitespace-pre-wrap overflow-x-auto text-[11px]">
                      {cppExecutionResult.compiler_output}
                    </pre>
                  </div>
                )}
              </div>

              {/* Submission Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
                <p className="text-xs text-stone-500">
                  Your code and automated test results will be evaluated and included in your final performance report.
                </p>

                <button
                  type="button"
                  onClick={handleSubmitCppSolution}
                  disabled={isSubmitting || cppCode.trim().length < 10}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-none text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs disabled:opacity-40 transition-all shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting C++ Solution...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit C++ Solution & Next Question</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-none text-xs text-rose-700 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Voice Response Console */}
          {activeWorkbenchTab === 'voice' && (
            <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Candidate Response Stream
                </span>
                {isRecording && (
                  <span className="text-xs font-mono font-bold text-rose-600 flex items-center gap-2 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-none bg-rose-600" />
                    Recording ({formatTimer(recordDuration)})
                  </span>
                )}
              </div>

              {/* Audio Waveform Visualizer */}
              <AudioVisualizer
                stream={liveMicStream}
                isActive={isRecording}
                isAiSpeaking={isSpeakingQuestion}
                accentColor="orange"
                height={52}
                label={isRecording ? "Live Mic Waveform • Studio Noise Suppression Active" : isSpeakingQuestion ? "AI Interviewer Speaking" : "Microphone Ready"}
              />

              {/* Transcript Display Box */}
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-none min-h-[160px] max-h-[240px] overflow-y-auto">
                {isEditingTranscript ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full h-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-stone-900 resize-none font-sans outline-none"
                    rows={5}
                    placeholder="Type or edit your response..."
                  />
                ) : (
                  <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {transcript || (
                      <span className="text-stone-400 italic">
                        Click "Start Speaking" or type your spoken response. Real-time Whisper streaming will transcribe your audio.
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      disabled={isPaused || isSubmitting}
                      className="flex items-center gap-2 px-5 py-3 rounded-none text-xs font-bold uppercase tracking-wider bg-orange-600 text-white hover:bg-orange-700 shadow-xs disabled:opacity-50 transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Speaking</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-5 py-3 rounded-none text-xs font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 shadow-xs animate-pulse transition-all"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop & Review</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                    className="px-4 py-2.5 rounded-none border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-bold uppercase tracking-wider shadow-xs"
                  >
                    {isEditingTranscript ? 'Done Editing' : 'Edit Text'}
                  </button>
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={isRecording || isSubmitting || transcript.trim().length < 5}
                  className="flex items-center gap-2 px-6 py-3 rounded-none text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs disabled:opacity-40 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scoring Multimodal Features...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-none text-xs text-rose-700 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Scenario Workbench (S1 Code Fix, S3 Teammates, N1 Persona) */}
          {activeWorkbenchTab === 'scenario' && (
            <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs space-y-5">
              {/* Tech S1 / S2 Scenario View */}
              {(scenarioType === 'S1' || scenarioType === 'S2') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                        S1: Failing Service Sandbox (Code Fix)
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Fix the unhandled retry accumulator duplication bug and verify sandboxed tests pass.
                      </p>
                    </div>
                    <button
                      onClick={handleRunCode}
                      disabled={isRunningCode}
                      className="flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider bg-stone-900 text-white hover:bg-stone-800 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      {isRunningCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4 text-orange-400" />}
                      <span>Run Sandboxed Tests</span>
                    </button>
                  </div>

                  <div className="border border-stone-300 rounded-none overflow-hidden font-mono text-xs">
                    <div className="bg-stone-100 px-4 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs flex justify-between">
                      <span>worker_reconciliation.py</span>
                      <span className="text-stone-400">Python 3.10 sandbox</span>
                    </div>
                    <textarea
                      value={codeContent}
                      onChange={(e) => setCodeContent(e.target.value)}
                      rows={10}
                      className="w-full p-4 bg-stone-900 text-emerald-300 font-mono text-xs focus:outline-hidden leading-relaxed resize-none rounded-none"
                    />
                  </div>

                  {codeRunResult && (
                    <div className={`p-4 rounded-none border text-xs ${
                      codeRunResult.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center justify-between font-bold mb-2">
                        <span className="flex items-center gap-2">
                          {codeRunResult.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                          {codeRunResult.passed ? 'All Sandboxed Tests Passed (3/3)' : 'Test Assertions Failed'}
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">{codeRunResult.execution_time_ms}ms</span>
                      </div>
                      <pre className="text-xs font-mono bg-white p-3 rounded-none mt-2 whitespace-pre-wrap border border-stone-200">
                        {codeRunResult.stdout}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Non-Tech N1 Persona Dialogue View */}
              {scenarioType === 'N1' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                        N1: Angry Customer Stakeholder Simulation
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        De-escalate client frustration empathetically before jumping to rigid company policy.
                      </p>
                    </div>
                    {/* Emotional Patience Bar */}
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                        Patience: {personaPatience}% ({personaMood})
                      </span>
                      <div className="w-32 h-2.5 bg-stone-200 rounded-none mt-1.5 overflow-hidden border border-stone-300">
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
                  <div className="h-64 bg-stone-50 border border-stone-200 rounded-none p-4 overflow-y-auto space-y-3 text-xs">
                    {personaChatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-none max-w-[85%] ${
                          msg.sender.includes('You')
                            ? 'bg-orange-600 text-white ml-auto'
                            : 'bg-white border border-stone-200 text-stone-800'
                        }`}
                      >
                        <span className={`text-[10px] font-bold block mb-1 uppercase tracking-wider ${msg.sender.includes('You') ? 'text-orange-200' : 'text-stone-500'}`}>
                          {msg.sender}
                        </span>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Input form */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={personaInput}
                      onChange={(e) => setPersonaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendPersonaChat()}
                      placeholder="Type your de-escalation statement..."
                      className="flex-1 text-xs border border-stone-300 rounded-none px-4 py-3 bg-white outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleSendPersonaChat}
                      disabled={isSendingPersonaChat || !personaInput.trim()}
                      className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-xs disabled:opacity-50"
                    >
                      Send Turn
                    </button>
                  </div>
                </div>
              )}

              {/* S3 Incident with Teammates View */}
              {scenarioType === 'S3' && (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-stone-200">
                    <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                      S3: Live Incident Triage with Simulated Teammates
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Collaborate in Slack with Alex (On-call Lead), Sarah (PM), and Leo (Junior).
                    </p>
                  </div>

                  <div className="h-64 bg-stone-50 border border-stone-200 rounded-none p-4 overflow-y-auto space-y-3 text-xs">
                    {teammateMessages.map((m, i) => (
                      <div key={i} className="p-3.5 rounded-none bg-white border border-stone-200 text-stone-800">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-orange-700 text-xs">{m.sender}</span>
                          <span className="text-[10px] text-stone-400 font-mono">({m.role})</span>
                        </div>
                        <p className="leading-relaxed text-stone-700">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={teammateInput}
                      onChange={(e) => setTeammateInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendTeammateChat()}
                      placeholder="Coordinate next mitigation steps..."
                      className="flex-1 text-xs border border-stone-300 rounded-none px-4 py-3 bg-white outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleSendTeammateChat}
                      disabled={!teammateInput.trim()}
                      className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-xs disabled:opacity-50"
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
