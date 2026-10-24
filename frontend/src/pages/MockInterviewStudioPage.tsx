import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  Brain,
  Sliders,
  FileText,
  Clock,
  Radio,
  HelpCircle,
  Award,
  Zap,
  Info
} from 'lucide-react';
import { ApiService } from '../services/api';
import { MockQuestionData, MockAssessResult } from '../types';
import { RepoGroundedStudio } from '../components/RepoGroundedStudio';
import { GitBranch, ShieldCheck, Cpu } from 'lucide-react';

export const MockInterviewStudioPage: React.FC = () => {
  const [studioMode, setStudioMode] = useState<'repo_grounded' | 'curated_mock'>('repo_grounded');
  const [questions, setQuestions] = useState<MockQuestionData[]>([]);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('mock_sys_1');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(true);

  // Candidate Recording & Input State
  const [candidateTranscript, setCandidateTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Evaluation & Assessment State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<MockAssessResult | null>(null);
  const [activeTab, setActiveTab] = useState<'deficits' | 'metrics' | 'exemplar' | 'comparison'>('deficits');

  // AI Exemplar Voice Player State
  const [isPlayingExemplar, setIsPlayingExemplar] = useState<boolean>(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId) || questions[0];

  useEffect(() => {
    loadQuestions();
    return () => {
      stopExemplarSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const data = await ApiService.getMockQuestions();
      setQuestions(data);
      if (data.length > 0) {
        setSelectedQuestionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load mock interview questions:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Sample answers for quick demonstration
  const handleLoadSample = (type: 'rushed_with_fillers' | 'strong_balanced' | 'incomplete') => {
    stopExemplarSpeech();
    if (type === 'rushed_with_fillers') {
      setCandidateTranscript(
        "Um, like, to prevent a cache stampede when a hot key expires under fifty thousand requests per second, like, we should basically use a distributed lock or singleflight request collapsing. And, uh, you know, we can also add TTL jitter so, like, the database doesn't crash when, um, everything expires all at once."
      );
    } else if (type === 'strong_balanced') {
      setCandidateTranscript(
        "To mitigate cache stampede under fifty thousand requests per second, I use a three-tier defense. First, singleflight request deduplication or a non-blocking Redis distributed lock ensures only one worker queries the database on cache miss. Second, I implement probabilistic early expiration with the XFetch algorithm to trigger background refreshes before hard expiration. Third, I apply randomized TTL jitter to prevent synchronized cache cliffs, complemented by a stale-while-revalidate fallback."
      );
    } else {
      setCandidateTranscript(
        "We can just increase the database CPU and memory, or add replica databases. Also maybe increase the Redis cache TTL so keys expire less frequently."
      );
    }
  };

  // Turn-taking recording controls using Web Speech API & MediaRecorder
  const handleStartRecording = async () => {
    stopExemplarSpeech();
    setCandidateTranscript('');
    setRecordedAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    // Browser Web Speech Recognition for live transcript
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setCandidateTranscript(current);
        };
        recognition.onerror = (e: any) => console.warn('SpeechRecognition error:', e);
        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }

    // MediaRecorder for audio blob
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access unavailable, please type or load sample answer.', err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  // Run assessment through all trained ML models
  const handleRunAssessment = async () => {
    if (!candidateTranscript.trim()) return;
    stopExemplarSpeech();
    setIsAnalyzing(true);
    try {
      // Calculate realistic audio metrics from recording duration or word cadence
      const wordCount = candidateTranscript.trim().split(/\s+/).length;
      const durationSec = recordingSeconds > 3 ? recordingSeconds : Math.max((wordCount / 135) * 60, 8);
      const computedWpm = Math.round((wordCount / (durationSec / 60)) * 10) / 10;

      const result = await ApiService.assessMockAnswer({
        question_id: selectedQuestion.id,
        transcript: candidateTranscript,
        audio_metrics: {
          speaking_rate_wpm: computedWpm,
          articulation_rate_wpm: Math.round(computedWpm * 1.1 * 10) / 10,
          total_speech_duration_seconds: Math.round(durationSec),
          pause_count: Math.max(Math.round(durationSec / 7), 2),
          total_pause_duration_seconds: Math.round(durationSec * 0.18 * 10) / 10,
        }
      });

      setAssessmentResult(result);
      setActiveTab('deficits');
    } catch (err) {
      console.error('Failed to run mock answer assessment:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Exemplar Voice Playback with sentence tracking & calibrated pacing
  const handlePlayExemplarVoice = () => {
    if (!window.speechSynthesis) return;

    if (isPlayingExemplar) {
      stopExemplarSpeech();
      return;
    }

    const segments = selectedQuestion?.model_exemplar?.speech_segments || [];
    if (segments.length === 0) return;

    window.speechSynthesis.cancel();
    setIsPlayingExemplar(true);
    setActiveSegmentIndex(0);

    let currentIdx = 0;

    const playNextSegment = () => {
      if (currentIdx >= segments.length) {
        setIsPlayingExemplar(false);
        setActiveSegmentIndex(-1);
        return;
      }

      setActiveSegmentIndex(currentIdx);
      const seg = segments[currentIdx];
      const utterance = new SpeechSynthesisUtterance(seg.text);

      // Calibrated rate (~140 WPM base)
      utterance.rate = 0.95 * playbackSpeed;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        currentIdx++;
        // Apply pause between segments
        const pauseMs = (seg.pause_after_sec || 0.6) * 1000;
        setTimeout(() => {
          if (isPlayingExemplar) {
            playNextSegment();
          }
        }, pauseMs);
      };

      utterance.onerror = () => {
        setIsPlayingExemplar(false);
        setActiveSegmentIndex(-1);
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextSegment();
  };

  const stopExemplarSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingExemplar(false);
    setActiveSegmentIndex(-1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              PRISM AI Studio
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">Candidate Multimodal Inspection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mock Interview Practice & AI Observation Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Record your answer via microphone or text. The system evaluates speech pacing, rubric alignment,
            and 5-head ensemble confidence, pinpoints exact deficits, and generates an AI-voiced exemplar answer.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Trained Models</span>
            <span className="text-xs font-mono font-semibold text-emerald-600 flex items-center gap-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              S-BERT + Prosody + Tree-Sitter AST
            </span>
          </div>
        </div>
      </div>

      {/* Studio Mode Selector Switcher */}
      <div className="flex items-center gap-3 mt-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            stopExemplarSpeech();
            setStudioMode('repo_grounded');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            studioMode === 'repo_grounded'
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Repo & Resume Grounded Studio (Tree-Sitter AST + pgvector)</span>
          <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
            Anti-Cheat
          </span>
        </button>

        <button
          onClick={() => {
            stopExemplarSpeech();
            setStudioMode('curated_mock');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            studioMode === 'curated_mock'
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Curated System & Behavioral Practice</span>
        </button>
      </div>

      {studioMode === 'repo_grounded' ? (
        <div className="mt-6">
          <RepoGroundedStudio />
        </div>
      ) : (
        /* Main Workspace Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* Left Column: Question Selection & Recording Workbench (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Question Selector Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">

              Select Mock Question Track
            </label>
            <select
              value={selectedQuestionId}
              onChange={(e) => {
                setSelectedQuestionId(e.target.value);
                setAssessmentResult(null);
                setCandidateTranscript('');
                stopExemplarSpeech();
              }}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.track_label}] {q.title}
                </option>
              ))}
            </select>

            {/* Selected Question Details */}
            {selectedQuestion && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{selectedQuestion.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {selectedQuestion.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedQuestion.question_text}
                </p>

                {/* Target Concepts */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Key Evaluated Concepts
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedQuestion.expected_concepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-indigo-50/70 border border-indigo-200 text-indigo-800 rounded-md font-mono"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target Pacing */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
                  <span className="flex items-center gap-1.5 font-medium text-indigo-900">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Target Speaking Rate:
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {selectedQuestion.target_wpm_range[0]} - {selectedQuestion.target_wpm_range[1]} WPM
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Answer Recording Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600" />
                Candidate Answer Submission
              </span>

              {/* Quick Sample Answers */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Samples:</span>
                <button
                  onClick={() => handleLoadSample('strong_balanced')}
                  className="px-2 py-0.5 text-indigo-700 hover:bg-indigo-50 rounded-md font-medium"
                >
                  Strong
                </button>
                <button
                  onClick={() => handleLoadSample('rushed_with_fillers')}
                  className="px-2 py-0.5 text-amber-700 hover:bg-amber-50 rounded-md font-medium"
                >
                  Rushed + Fillers
                </button>
                <button
                  onClick={() => handleLoadSample('incomplete')}
                  className="px-2 py-0.5 text-rose-700 hover:bg-rose-50 rounded-md font-medium"
                >
                  Incomplete
                </button>
              </div>
            </div>

            {/* Audio Recording Control Bar */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Voice Answer</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs animate-pulse"
                >
                  <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <span>Stop Recording ({recordingSeconds}s)</span>
                </button>
              )}

              {audioUrl && (
                <audio controls src={audioUrl} className="h-8 flex-1 max-w-[200px]" />
              )}

              <div className="ml-auto text-[11px] font-mono text-slate-500">
                {candidateTranscript.trim() ? `${candidateTranscript.trim().split(/\s+/).length} words` : '0 words'}
              </div>
            </div>

            {/* Transcript Textarea */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Transcript (Spoken Speech or Typed Answer)
              </label>
              <textarea
                value={candidateTranscript}
                onChange={(e) => setCandidateTranscript(e.target.value)}
                placeholder="Speak your response or type here... Mention core architectural mechanisms, edge cases, and trade-offs."
                rows={7}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
            </div>

            {/* Submit & Inspect Button */}
            <button
              onClick={handleRunAssessment}
              disabled={isAnalyzing || !candidateTranscript.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Multimodal Ensemble & Extracting Pinpoints...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Deep Inspection & Pinpoint Deficits</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Deep Observation, Pinpoint Deficits & AI Exemplar (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {!assessmentResult ? (
            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Observation Pipeline Awaiting Input</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
                Record or load a candidate answer on the left. The system will process it through our
                Sentence-BERT text model, acoustic prosody regressor, and 5-head ensemble to pinpoint exact
                deficits and generate an AI-voiced exemplar.
              </p>
              <button
                onClick={() => handleLoadSample('rushed_with_fillers')}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
              >
                Load Sample Answer with Rushed Cadence
              </button>
            </div>
          ) : (
            /* Active Assessment & Pinpoint Analysis */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Scorecard Header Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Multimodal Fused Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {assessmentResult.overall_fused_score}
                    </span>
                    <span className="text-slate-400 font-medium text-xs">/ 5.0</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-indigo-600 mt-0.5 block">
                    Calibrated CI: {assessmentResult.overall_ci}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Pacing & Speech Rate
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-900">
                      {assessmentResult.voice_metrics.speaking_rate_wpm}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">WPM</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-0.5 block ${
                      assessmentResult.voice_metrics.speaking_rate_wpm >= 130 &&
                      assessmentResult.voice_metrics.speaking_rate_wpm <= 155
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {assessmentResult.voice_metrics.speaking_rate_wpm >= 130 &&
                    assessmentResult.voice_metrics.speaking_rate_wpm <= 155
                      ? '✓ Optimal Pacing'
                      : assessmentResult.voice_metrics.speaking_rate_wpm > 155
                      ? '⚠️ Rapid / Rushed'
                      : '⚠️ Deliberate / Slow'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Concept Coverage
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-900">
                      {assessmentResult.concept_analysis.coverage_percentage}%
                    </span>
                    <span className="text-slate-400 text-xs">
                      ({assessmentResult.concept_analysis.concepts_covered.length}/
                      {assessmentResult.concept_analysis.total_expected})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                    Fillers: {assessmentResult.voice_metrics.total_filler_words} detected
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setActiveTab('deficits')}
                  className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'deficits'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Pinpointed Deficits ({assessmentResult.pinpointed_deficits.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('exemplar')}
                  className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'exemplar'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>AI-Voiced Exemplar Answer</span>
                </button>

                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'comparison'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Candidate vs Exemplar Matrix</span>
                </button>

                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'metrics'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Model Metrics Breakdown</span>
                </button>
              </div>

              {/* Tab 1: Pinpointed Deficits & Targeted Drills */}
              {activeTab === 'deficits' && (
                <div className="space-y-4">
                  {/* Deficit Alert Cards */}
                  <div className="space-y-3">
                    {assessmentResult.pinpointed_deficits.map((def, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border text-xs leading-relaxed ${
                          def.severity === 'high'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : def.severity === 'medium'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {def.severity === 'high' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : def.severity === 'medium' ? (
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-bold text-sm">{def.title}</span>
                        </div>
                        <p className="mt-1">{def.detail}</p>
                        <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-start gap-1 font-medium">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                            Actionable Fix:
                          </span>
                          <span>{def.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Targeted Practice Drills */}
                  {assessmentResult.actionable_drills.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Recommended Calibration Drills
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {assessmentResult.actionable_drills.map((drill, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs"
                          >
                            <span className="font-bold text-slate-900 block">{drill.title}</span>
                            <p className="text-slate-600 leading-snug">{drill.instruction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: AI-Voiced Exemplar Answer Player */}
              {activeTab === 'exemplar' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                  {/* Player Control Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayExemplarVoice}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform active:scale-95 ${
                          isPlayingExemplar ? 'bg-indigo-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                        title={isPlayingExemplar ? 'Stop Playback' : 'Play Calibrated Exemplar Voice'}
                      >
                        {isPlayingExemplar ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            AI-Voiced Exemplar Audio Delivery
                          </span>
                          {isPlayingExemplar && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white animate-pulse">
                              Playing Aloud (~140 WPM)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Synthesized with structured 0.6s–0.8s pauses and calibrated executive cadence.
                        </p>
                      </div>
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Speed:</span>
                      {[0.9, 1.0, 1.1].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            stopExemplarSpeech();
                            setPlaybackSpeed(s);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold ${
                            playbackSpeed === s
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Pacing Visualizer */}
                  {isPlayingExemplar && (
                    <div className="flex items-center justify-center gap-1 py-2">
                      {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 90, 45, 60].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-indigo-500 rounded-full animate-bounce"
                          style={{
                            height: `${h * 0.35}px`,
                            animationDelay: `${(i % 5) * 120}ms`,
                            animationDuration: '600ms'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Segmented Exemplar Text with Live Sentence Tracking */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Sentence-by-Sentence Speech Segmentation & Pacing
                    </span>
                    <div className="space-y-2 text-xs leading-relaxed">
                      {assessmentResult.model_exemplar.speech_segments.map((seg, idx) => {
                        const isActive = isPlayingExemplar && activeSegmentIndex === idx;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition-all ${
                              isActive
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                                : 'bg-slate-50/60 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span>{seg.text}</span>
                              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                pause: {seg.pause_after_sec}s
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {seg.emphasis_words.map((w, wi) => (
                                <span
                                  key={wi}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold"
                                >
                                  emphasize: {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Candidate vs Exemplar Side-by-Side Comparison */}
              {activeTab === 'comparison' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Side-by-Side Metric Diagnostic Matrix
                  </h3>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="p-3">Telemetry Metric</th>
                          <th className="p-3 text-indigo-700">Your Answer Performance</th>
                          <th className="p-3 text-slate-900">AI Exemplar Benchmark</th>
                          <th className="p-3">Status Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                          <td className="p-3 font-sans text-slate-700 font-medium">Speaking Rate</td>
                          <td className="p-3 font-bold text-slate-900">
                            {assessmentResult.comparison.candidate.speaking_rate_wpm} WPM
                          </td>
                          <td className="p-3 text-slate-700">
                            {assessmentResult.comparison.exemplar.speaking_rate_wpm} WPM (Target: 130–155)
                          </td>
                          <td className="p-3 font-sans">
                            {assessmentResult.comparison.candidate.speaking_rate_wpm >= 130 &&
                            assessmentResult.comparison.candidate.speaking_rate_wpm <= 155 ? (
                              <span className="text-emerald-600 font-semibold">✓ In Target Range</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">⚠️ Needs Adjustment</span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-3 font-sans text-slate-700 font-medium">Filler Word Density</td>
                          <td className="p-3 font-bold text-slate-900">
                            {assessmentResult.comparison.candidate.total_filler_words} occurrences
                          </td>
                          <td className="p-3 text-slate-700">0 occurrences</td>
                          <td className="p-3 font-sans">
                            {assessmentResult.comparison.candidate.total_filler_words <= 2 ? (
                              <span className="text-emerald-600 font-semibold">✓ Clean & Authoritative</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">⚠️ High Filler Density</span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-3 font-sans text-slate-700 font-medium">Key Concept Coverage</td>
                          <td className="p-3 font-bold text-slate-900">
                            {assessmentResult.comparison.candidate.concept_coverage_percent}%
                          </td>
                          <td className="p-3 text-slate-700">100.0%</td>
                          <td className="p-3 font-sans">
                            {assessmentResult.comparison.candidate.concept_coverage_percent >= 80 ? (
                              <span className="text-emerald-600 font-semibold">✓ Thorough Technical Coverage</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">⚠️ Missing Key Concepts</span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-3 font-sans text-slate-700 font-medium">Structural Pauses</td>
                          <td className="p-3 font-bold text-slate-900">
                            {assessmentResult.comparison.candidate.pause_count} pauses (avg {assessmentResult.comparison.candidate.average_pause_sec}s)
                          </td>
                          <td className="p-3 text-slate-700">
                            {assessmentResult.comparison.exemplar.pause_count} pauses (avg {assessmentResult.comparison.exemplar.average_pause_sec}s)
                          </td>
                          <td className="p-3 font-sans">
                            <span className="text-slate-600">Composed cadence</span>
                          </td>
                        </tr>

                        <tr>
                          <td className="p-3 font-sans text-slate-700 font-medium">Ensemble 90% CI Band</td>
                          <td className="p-3 font-bold text-indigo-700">
                            {assessmentResult.comparison.candidate.confidence_interval}
                          </td>
                          <td className="p-3 text-slate-700">
                            {assessmentResult.comparison.exemplar.confidence_interval}
                          </td>
                          <td className="p-3 font-sans">
                            <span className="text-emerald-600 font-semibold">Calibrated Ensemble</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Model Metrics Breakdown */}
              {activeTab === 'metrics' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Sentence-BERT Rubric Criteria Breakdown
                  </h3>
                  <div className="space-y-3">
                    {assessmentResult.rubric_breakdown.map((crit, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{crit.criterion_name}</span>
                          <span className="font-mono font-bold text-indigo-700">
                            {crit.score} / {crit.maximum_score}
                          </span>
                        </div>
                        <p className="text-slate-600 italic">"{crit.evidence}"</p>
                        <p className="text-[11px] text-slate-500">{crit.missing_elements}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
export default MockInterviewStudioPage;
