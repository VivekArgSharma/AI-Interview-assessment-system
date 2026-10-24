import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Radio,
  RefreshCw,
  Sparkles,
  Code2,
  Volume2,
  ArrowRight,
  FileCode,
  Check,
  Layers,
  ChevronRight,
  ExternalLink,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { ApiService } from '../services/api';
import {
  GroundedRepoData,
  GroundedQuestionData,
  ResumeClaimData,
  RepoGroundedAssessResult
} from '../types';

export const RepoGroundedStudio: React.FC = () => {
  // Ingestion Mode & State
  const [hasIngested, setHasIngested] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Ingested Candidate Data
  const [candidateProfile, setCandidateProfile] = useState<{
    name: string;
    filename: string;
    skills: string[];
    claims: ResumeClaimData[];
    questions: GroundedQuestionData[];
    codeAst?: any;
  } | null>(null);

  // Selected Question & Candidate Answer State
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Evaluation & Assessment State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<RepoGroundedAssessResult | null>(null);

  // AI Exemplar Voice Player State
  const [isPlayingExemplar, setIsPlayingExemplar] = useState<boolean>(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Upload Form State (for custom text or code)
  const [uploadTab, setUploadTab] = useState<'pdf' | 'text' | 'sample'>('pdf');
  const [rawResumeText, setRawResumeText] = useState<string>('');
  const [accompanyingCode, setAccompanyingCode] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  const activeQuestion =
    candidateProfile?.questions.find((q) => q.question_id === selectedQuestionId) ||
    candidateProfile?.questions[0];

  useEffect(() => {
    return () => {
      stopExemplarSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle PDF file selection & upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    await processFileUpload(file);
  };

  const processFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    stopExemplarSpeech();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (accompanyingCode.trim()) {
        formData.append('code_content', accompanyingCode);
      }

      const res = await ApiService.uploadResumePdf(formData);
      setCandidateProfile({
        name: res.detected_name || 'Candidate Profile',
        filename: res.filename || file.name,
        skills: res.detected_skills || [],
        claims: res.claims || [],
        questions: res.grounded_questions || [],
        codeAst: res.code_ast,
      });

      if (res.grounded_questions.length > 0) {
        setSelectedQuestionId(res.grounded_questions[0].question_id);
      }
      setHasIngested(true);
      setAssessmentResult(null);
      setCandidateAnswer('');
    } catch (err: any) {
      console.error('Failed to upload resume:', err);
      setUploadError(err.message || 'Failed to parse resume PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Raw Text Resume Ingestion
  const handleTextResumeSubmit = async () => {
    if (!rawResumeText.trim()) return;
    setIsUploading(true);
    setUploadError(null);
    stopExemplarSpeech();

    try {
      const formData = new FormData();
      formData.append('resume_text', rawResumeText);
      if (accompanyingCode.trim()) {
        formData.append('code_content', accompanyingCode);
      }

      const res = await ApiService.uploadResumePdf(formData);
      setCandidateProfile({
        name: res.detected_name || 'Candidate Profile',
        filename: 'candidate_resume.txt',
        skills: res.detected_skills || [],
        claims: res.claims || [],
        questions: res.grounded_questions || [],
        codeAst: res.code_ast,
      });

      if (res.grounded_questions.length > 0) {
        setSelectedQuestionId(res.grounded_questions[0].question_id);
      }
      setHasIngested(true);
      setAssessmentResult(null);
      setCandidateAnswer('');
    } catch (err: any) {
      console.error('Failed to parse text resume:', err);
      setUploadError(err.message || 'Failed to parse resume text.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load Curated Sample (for quick inspection without uploading personal PDF)
  const handleLoadSampleProfile = async () => {
    setIsUploading(true);
    setUploadError(null);
    stopExemplarSpeech();

    try {
      const repos = await ApiService.getGroundedRepositories();
      const repo = repos[0]; // Distributed Cache Engine

      const sampleQuestions: GroundedQuestionData[] = repo.grounded_questions;
      setCandidateProfile({
        name: 'Vivek Sharma — Senior Distributed Systems Engineer',
        filename: 'sample_staff_resume.pdf',
        skills: ['Python', 'Redis', 'PostgreSQL', 'Docker', 'Kubernetes', 'AsyncIO', 'Kafka'],
        claims: repo.resume_claims,
        questions: sampleQuestions,
        codeAst: repo.files[0],
      });

      if (sampleQuestions.length > 0) {
        setSelectedQuestionId(sampleQuestions[0].question_id);
      }
      setHasIngested(true);
      setAssessmentResult(null);
      setCandidateAnswer('');
    } catch (err: any) {
      console.error('Failed to load sample profile:', err);
      setUploadError('Failed to load sample profile.');
    } finally {
      setIsUploading(false);
    }
  };

  // Turn-taking Speech-to-Text recording
  const handleStartRecording = () => {
    stopExemplarSpeech();
    setCandidateAnswer('');
    setIsRecording(true);
    setRecordingSeconds(0);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setCandidateAnswer(currentTranscript.trim());
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not start SpeechRecognition:', e);
      }
    }

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Sample demo answers for testing
  const handleLoadSampleAnswer = (type: 'generic_ai' | 'authentic_defense') => {
    stopExemplarSpeech();
    if (type === 'generic_ai') {
      setCandidateAnswer(
        "Generally speaking, caching and database transactions are very critical in software architecture to reduce latency and scale requests. It is always best practice to structure things with proper error handling and monitoring. Depending on the company requirements, there are several patterns like write-through or cache-aside, and in conclusion, caching improves system performance."
      );
    } else {
      setCandidateAnswer(
        "In this project, I structured the cache with an in-memory singleflight lock and randomized TTL jitter to prevent database thundering herd when hot keys expire under 40,000 requests per second. Only the first coroutine acquires the lease to compute the fresh query, while other requests safely receive the cached value via stale-while-revalidate. I added fifteen percent randomized TTL jitter to prevent synchronized expiration cliffs. In our production cluster, we also use Redis SETNX distributed mutexes to coordinate across pods."
      );
    }
  };

  // Evaluate candidate answer against AST ground truth & anti-cheat
  const handleRunEvaluation = async () => {
    if (!candidateAnswer.trim() || !activeQuestion) return;
    stopExemplarSpeech();
    setIsEvaluating(true);
    try {
      const res = await ApiService.assessRepoGroundedAnswer({
        question_id: activeQuestion.question_id,
        candidate_answer: candidateAnswer,
      });
      setAssessmentResult(res);
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // AI Exemplar Voice Playback
  const stopExemplarSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingExemplar(false);
    setActiveSegmentIndex(-1);
  };

  const playExemplarWithPacing = () => {
    if (!assessmentResult?.exemplar_defense?.speech_segments) return;
    if (isPlayingExemplar) {
      stopExemplarSpeech();
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('SpeechSynthesis is not supported in this browser.');
      return;
    }

    setIsPlayingExemplar(true);
    setActiveSegmentIndex(0);

    const segments = assessmentResult.exemplar_defense.speech_segments;
    let currentIndex = 0;

    const playSegment = (index: number) => {
      if (index >= segments.length) {
        setIsPlayingExemplar(false);
        setActiveSegmentIndex(-1);
        return;
      }

      setActiveSegmentIndex(index);
      const seg = segments[index];
      const utterance = new SpeechSynthesisUtterance(seg.text);

      utterance.rate = 0.95 * playbackSpeed;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        const pauseMs = (seg.pause_after_sec || 0.45) * 1000;
        setTimeout(() => {
          currentIndex++;
          playSegment(currentIndex);
        }, pauseMs);
      };

      utterance.onerror = () => {
        setIsPlayingExemplar(false);
        setActiveSegmentIndex(-1);
      };

      window.speechSynthesis.speak(utterance);
    };

    playSegment(0);
  };

  return (
    <div className="space-y-10 py-2">
      {/* =========================================================================
          SECTION 1: ONBOARDING & RESUME INGESTION (SPACED OUT & CLEAN)
         ========================================================================= */}
      {!hasIngested ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1 of 2: Ingestion & AST Grounding</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Ingest Your Resume to Generate Grounded Interview Probing
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Upload your actual Resume PDF or paste your technical background. Our system uses <strong>Tree-Sitter AST parsing</strong> and <strong>pgvector code embeddings</strong> to synthesize the exact deep architectural questions companies ask in real senior engineering interviews.
            </p>
          </div>

          {/* Ingestion Method Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                onClick={() => setUploadTab('pdf')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  uploadTab === 'pdf'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Resume PDF</span>
              </button>

              <button
                onClick={() => setUploadTab('text')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  uploadTab === 'text'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Resume Text</span>
              </button>

              <button
                onClick={() => setUploadTab('sample')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  uploadTab === 'sample'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Try Staff Engineer Sample</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Tab 1: PDF File Dropzone */}
          {uploadTab === 'pdf' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-10 text-center cursor-pointer transition-all space-y-4"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md shadow-indigo-200">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Click to browse or drag & drop your Resume PDF
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, DOCX, or TXT up to 10MB
                  </p>
                </div>
                {selectedFileName && (
                  <span className="inline-block bg-white border border-indigo-200 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full shadow-xs">
                    Selected: {selectedFileName}
                  </span>
                )}
              </div>

              {/* Optional Accompanying Code */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Optional: Accompanying Project Code or GitHub Snippet</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Tree-Sitter AST & pgvector</span>
                </div>
                <textarea
                  rows={4}
                  value={accompanyingCode}
                  onChange={(e) => setAccompanyingCode(e.target.value)}
                  placeholder="Paste Python, TypeScript, or JavaScript code from your repository (e.g. your cache manager, message consumer, or rate limiter)..."
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {isUploading && (
                <div className="text-center py-4 text-xs font-semibold text-indigo-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting resume text via pypdf & generating grounded questions...</span>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Raw Text Resume */}
          {uploadTab === 'text' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Paste Resume or Profile Summary (Experience, Skills, Bullet Points)
                </label>
                <textarea
                  rows={8}
                  value={rawResumeText}
                  onChange={(e) => setRawResumeText(e.target.value)}
                  placeholder="Paste your resume experience bullets here (e.g. 'Architected distributed caching layer with Redis handling 40,000 req/sec with 99.8% hit rate...')"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Accompanying Code */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Optional: Accompanying Source Code (for Tree-Sitter AST)</span>
                </span>
                <textarea
                  rows={3}
                  value={accompanyingCode}
                  onChange={(e) => setAccompanyingCode(e.target.value)}
                  placeholder="Paste Python, TypeScript, or JavaScript code..."
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleTextResumeSubmit}
                  disabled={isUploading || !rawResumeText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Ingesting Resume & Synthesizing Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Ingest & Generate Grounded Questions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Curated Sample Profile */}
          {uploadTab === 'sample' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-5">
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl mx-auto flex items-center justify-center font-bold">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Staff Engineer Resume & Distributed Cache Engine
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instantly loads a representative resume profile with claims on Redis stampede locks, TTL jitter, and asynchronous order pipelines, paired with real Python Tree-Sitter AST code.
                </p>
              </div>

              <button
                onClick={handleLoadSampleProfile}
                disabled={isUploading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading Sample...</span>
                  </>
                ) : (
                  <>
                    <span>Explore With Sample Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
            SECTION 2: INGESTED PROFILE & ACTIVE PROBING STUDIO (SPACED OUT)
           ========================================================================= */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Candidate Ingested Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    {candidateProfile?.name}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Resume Ingested
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Source: {candidateProfile?.filename} • {candidateProfile?.claims.length} claims extracted
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHasIngested(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all"
              >
                Upload Different Resume
              </button>
            </div>
          </div>

          {/* Detected Skills Strip */}
          {candidateProfile?.skills && candidateProfile.skills.length > 0 && (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Detected Technical Focus:
              </span>
              {candidateProfile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg shadow-2xs font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (5 Cols): Generated Probing Questions from Resume */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Targeted Interview Questions ({candidateProfile?.questions.length})
                </span>
                <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                  Tree-Sitter Grounded
                </span>
              </div>

              <div className="space-y-3">
                {candidateProfile?.questions.map((q) => (
                  <button
                    key={q.question_id}
                    onClick={() => {
                      stopExemplarSpeech();
                      setSelectedQuestionId(q.question_id);
                      setAssessmentResult(null);
                      setCandidateAnswer('');
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedQuestionId === q.question_id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200/90 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="font-bold text-indigo-700">{q.category}</span>
                      <span className="text-slate-400 text-[10px]">{q.line_range}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{q.title}</h4>
                    {q.source_claim && (
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic bg-white/70 p-1.5 rounded border border-slate-100 font-sans">
                        “{q.source_claim}”
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* AST Telemetry Pill */}
              <div className="p-4 rounded-2xl bg-indigo-950 text-white text-xs space-y-2 border border-indigo-900 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>pgvector Code Embeddings Active</span>
                </div>
                <p className="text-[11px] text-indigo-200 leading-relaxed">
                  Your questions are grounded in 384-dimensional dense vectors indexed with HNSW cosine similarity. Generic answers lacking architectural numbers or trade-offs will trigger anti-cheat evasion alerts.
                </p>
              </div>
            </div>

            {/* Right Column (7 Cols): The Probing Question & Candidate Defense */}
            <div className="lg:col-span-7 space-y-6">
              {activeQuestion ? (
                <>
                  {/* Active Question Box */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                        {activeQuestion.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Anti-Cheat Verification: Enabled
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {activeQuestion.question_text}
                    </h3>

                    {activeQuestion.source_claim && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Referenced from your resume:
                        </span>
                        <p className="italic font-medium">"{activeQuestion.source_claim}"</p>
                      </div>
                    )}

                    {/* Required Constructs */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Expected Technical Primitives to Defend:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeQuestion.key_code_constructs.map((c, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 text-slate-800 text-xs font-mono font-medium px-2.5 py-1 rounded-lg border border-slate-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Candidate Answer Workspace */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Your Spoken or Written Defense
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadSampleAnswer('generic_ai')}
                          className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 transition-all"
                          title="Tests anti-cheat detection on canned ChatGPT responses"
                        >
                          Try Generic AI Answer
                        </button>
                        <button
                          onClick={() => handleLoadSampleAnswer('authentic_defense')}
                          className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition-all"
                          title="Tests high-fidelity authentic engineering defense"
                        >
                          Try Senior Defense
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={6}
                        value={candidateAnswer}
                        onChange={(e) => setCandidateAnswer(e.target.value)}
                        placeholder="Speak or type your architectural defense here. Explain why you structured your caching, concurrency, or idempotency this way, and defend the trade-offs..."
                        className="w-full text-xs font-sans p-4 border border-slate-200 rounded-2xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed transition-all"
                      />
                      {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                          <Radio className="w-3.5 h-3.5" />
                          <span>RECORDING: {recordingSeconds}s</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {!isRecording ? (
                          <button
                            onClick={handleStartRecording}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs"
                          >
                            <Radio className="w-3.5 h-3.5 text-red-400" />
                            <span>Record Spoken Defense</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleStopRecording}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs"
                          >
                            <span>Stop Recording</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleRunEvaluation}
                        disabled={isEvaluating || !candidateAnswer.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                      >
                        {isEvaluating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Evaluating Against AST Ground Truth...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Analyze Grounding & Anti-Cheat</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Assessment Results Section */}
                  {assessmentResult && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                          <span>Evaluation Diagnostic & Anti-Cheat Telemetry</span>
                        </h4>
                        <span className="text-xs font-mono text-slate-400">
                          Question ID: {assessmentResult.question_id}
                        </span>
                      </div>

                      {/* Primary Diagnostic Metrics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Grounding Fidelity
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">
                              {assessmentResult.grounding_fidelity_score}%
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                assessmentResult.grounding_fidelity_score >= 70
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {assessmentResult.grounding_fidelity_score >= 70 ? '✓ Grounded' : '⚠️ Superficial'}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`p-4 rounded-2xl border ${
                            assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-red-50/70 border-red-200 text-red-950'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Anti-Cheat Evasion Risk
                          </span>
                          <span
                            className={`text-2xl font-black block ${
                              assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {assessmentResult.anti_cheat_analysis.ai_evasion_risk} Risk
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Trade-off Defense
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">
                              {assessmentResult.architectural_defense_score}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">/ 100</span>
                          </div>
                        </div>
                      </div>

                      {/* Anti-Cheat Detailed Explanation */}
                      <div
                        className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                          assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-red-50 border-red-200 text-red-950'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                          {assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low' ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>Authentic Engineering Defense:</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-4 h-4 text-red-600" />
                              <span>Generic AI Evasion Detected:</span>
                            </>
                          )}
                        </div>
                        <p>{assessmentResult.anti_cheat_analysis.diagnostic_note}</p>
                      </div>

                      {/* Missing Primitives / Deficits */}
                      {assessmentResult.pinpointed_deficits.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-900 block">
                            Pinpointed Code Deficits ({assessmentResult.pinpointed_deficits.length}):
                          </span>
                          <div className="space-y-2">
                            {assessmentResult.pinpointed_deficits.map((d, i) => (
                              <div
                                key={i}
                                className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs flex items-start gap-2.5"
                              >
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-mono font-bold text-amber-950">
                                    Omitted: {d.construct}
                                  </span>
                                  <p className="text-amber-800 mt-0.5">{d.feedback}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI-Voiced Exemplar Audio Player */}
                      {assessmentResult.exemplar_defense && (
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 space-y-4 border border-indigo-900 shadow-md">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-indigo-400" />
                              <span className="font-bold text-sm text-white">
                                AI-Voiced Exemplar Defense (~140 WPM Pacing)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPlaybackSpeed(playbackSpeed === 1.0 ? 1.1 : 1.0)}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 transition-all"
                              >
                                {playbackSpeed}x Speed
                              </button>

                              <button
                                onClick={playExemplarWithPacing}
                                className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                                  isPlayingExemplar
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {isPlayingExemplar ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5" />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Hear Model Defense</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Synchronous Highlight Tracking */}
                          <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                            {assessmentResult.exemplar_defense.speech_segments.map((seg, idx) => (
                              <span
                                key={idx}
                                className={`transition-all duration-200 inline-block mr-2 ${
                                  activeSegmentIndex === idx
                                    ? 'bg-indigo-500/50 text-white font-semibold rounded px-2 py-0.5 border border-indigo-400/60'
                                    : 'text-slate-300'
                                }`}
                              >
                                {seg.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                  Select a probing question from the left panel to begin.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
