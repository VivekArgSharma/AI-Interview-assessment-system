import React, { useState, useEffect, useRef } from 'react';
import {
  Code,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  FileText,
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
  Clock,
  Radio,
  Upload,
  Cpu,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { ApiService } from '../services/api';
import {
  GroundedRepoData,
  GroundedQuestionData,
  ResumeClaimData,
  RepoGroundedAssessResult
} from '../types';

export const RepoGroundedStudio: React.FC = () => {
  // Repositories & Ingestion State
  const [repositories, setRepositories] = useState<GroundedRepoData[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('repo_cache_engine');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('gq_cache_structure');
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);

  // Custom Repo Ingestion Modal/Drawer State
  const [showCustomRepoInput, setShowCustomRepoInput] = useState<boolean>(false);
  const [customRepoName, setCustomRepoName] = useState<string>('custom-backend-service');
  const [customLanguage, setCustomLanguage] = useState<string>('python');
  const [customCode, setCustomCode] = useState<string>(`class CacheManager:\n    def __init__(self):\n        self._store = {}\n        self._locks = {}\n\n    async def get_or_compute(self, key: str, compute_fn):\n        if key in self._store:\n            return self._store[key]\n        # Stampede lock\n        import asyncio\n        if key not in self._locks:\n            self._locks[key] = asyncio.Lock()\n        async with self._locks[key]:\n            if key in self._store:\n                return self._store[key]\n            val = await compute_fn()\n            self._store[key] = val\n            return val`);
  const [isParsingCustom, setIsParsingCustom] = useState<boolean>(false);

  // Resume Ingestion State
  const [resumeText, setResumeText] = useState<string>(
    "Vivek Sharma - Senior Systems Engineer\nExperience:\n- Architected low-latency distributed caching layer with stampede protection handling 40,000 requests/sec with 99.8% cache hit rate.\n- Implemented multi-region Raft consensus for active-active cache invalidation.\n- Designed async event consumer pipeline processing 25,000 order transactions/sec."
  );
  const [resumeClaims, setResumeClaims] = useState<ResumeClaimData[]>([]);
  const [isCrossReferencingResume, setIsCrossReferencingResume] = useState<boolean>(false);
  const [showResumeDrawer, setShowResumeDrawer] = useState<boolean>(false);

  // Candidate Answer & Recording State
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

  // Refs
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  const selectedRepo = repositories.find((r) => r.repo_id === selectedRepoId) || repositories[0];
  const selectedQuestion =
    selectedRepo?.grounded_questions.find((q) => q.question_id === selectedQuestionId) ||
    selectedRepo?.grounded_questions[0];

  useEffect(() => {
    loadRepositories();
    return () => {
      stopExemplarSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const data = await ApiService.getGroundedRepositories();
      setRepositories(data);
      if (data.length > 0) {
        setSelectedRepoId(data[0].repo_id);
        setResumeClaims(data[0].resume_claims);
        if (data[0].grounded_questions.length > 0) {
          setSelectedQuestionId(data[0].grounded_questions[0].question_id);
        }
      }
    } catch (err) {
      console.error('Failed to load grounded repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSelectRepo = (repoId: string) => {
    stopExemplarSpeech();
    setSelectedRepoId(repoId);
    setAssessmentResult(null);
    setCandidateAnswer('');
    const repo = repositories.find((r) => r.repo_id === repoId);
    if (repo) {
      setResumeClaims(repo.resume_claims);
      if (repo.grounded_questions.length > 0) {
        setSelectedQuestionId(repo.grounded_questions[0].question_id);
      }
    }
  };

  const handleSelectQuestion = (qId: string) => {
    stopExemplarSpeech();
    setSelectedQuestionId(qId);
    setAssessmentResult(null);
    setCandidateAnswer('');
  };

  // Cross-reference candidate resume
  const handleCrossReferenceResume = async () => {
    setIsCrossReferencingResume(true);
    try {
      const res = await ApiService.parseCandidateResume(resumeText, selectedRepoId);
      setResumeClaims(res.claims);
    } catch (err) {
      console.error('Failed to cross-reference resume:', err);
    } finally {
      setIsCrossReferencingResume(false);
    }
  };

  // Parse custom repository code
  const handleParseCustomRepo = async () => {
    if (!customCode.trim()) return;
    setIsParsingCustom(true);
    try {
      const res = await ApiService.parseCustomRepo({
        repo_name: customRepoName,
        primary_language: customLanguage,
        code_content: customCode,
        file_path: customLanguage === 'python' ? 'cache_manager.py' : 'cache_manager.ts',
      });

      const newRepo: GroundedRepoData = {
        repo_id: res.repo_id,
        repo_name: res.repo_name,
        primary_language: res.primary_language,
        description: `Candidate custom ${customLanguage} repository parsed with Tree-Sitter AST & indexed into pgvector.`,
        files: [
          {
            file_path: res.file_path,
            classes: res.ast_analysis.classes,
            functions: res.ast_analysis.functions,
            total_lines: res.ast_analysis.total_lines,
            patterns: res.ast_analysis.architectural_patterns,
            code_preview: customCode,
          },
        ],
        resume_claims: [
          {
            claim_id: 'custom_claim_1',
            claim_text: `Architected custom ${customRepoName} with ${res.ast_analysis.classes.length} classes and ${res.ast_analysis.functions.length} functions.`,
            verified: true,
            target_file: res.file_path,
            ast_correlation: 'Verified in Tree-Sitter AST',
          },
        ],
        grounded_questions: res.generated_questions,
      };

      setRepositories((prev) => [newRepo, ...prev]);
      setSelectedRepoId(newRepo.repo_id);
      setResumeClaims(newRepo.resume_claims);
      if (newRepo.grounded_questions.length > 0) {
        setSelectedQuestionId(newRepo.grounded_questions[0].question_id);
      }
      setShowCustomRepoInput(false);
    } catch (err) {
      console.error('Failed to parse custom repo:', err);
    } finally {
      setIsParsingCustom(false);
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

  // Sample demo answers
  const handleLoadSample = (type: 'generic_ai_assistant' | 'grounded_authentic') => {
    stopExemplarSpeech();
    if (type === 'generic_ai_assistant') {
      setCandidateAnswer(
        "Generally speaking, caching is an important concept in software development to reduce latency and improve system throughput. It is best practice to implement cache expiration and avoid database overload. There are several ways to structure a cache depending on the requirements, and in conclusion, caching makes things faster."
      );
    } else {
      setCandidateAnswer(
        "In src/cache/distributed_cache.py, I structured the cache with an in-memory asyncio.Lock and double-checked locking specifically to prevent local thundering herd without paying the latency penalty of network calls to Redis on every concurrent coroutine miss. Only the first coroutine computes the fresh value while others wait, and once unlocked, the double-check condition returns the cached entry immediately. To eliminate synchronized cache cliffs, I implemented fifteen percent randomized TTL jitter in _calculate_jittered_ttl. While this protects single-instance pods, in a multi-pod Kubernetes deployment, an external Redis distributed lock would be required to coordinate across instances."
      );
    }
  };

  // Assess candidate answer against ground truth AST & anti-cheat
  const handleRunEvaluation = async () => {
    if (!candidateAnswer.trim() || !selectedQuestion) return;
    stopExemplarSpeech();
    setIsEvaluating(true);
    try {
      const res = await ApiService.assessRepoGroundedAnswer({
        question_id: selectedQuestion.question_id,
        candidate_answer: candidateAnswer,
        repo_id: selectedRepoId,
      });
      setAssessmentResult(res);
    } catch (err) {
      console.error('Failed to evaluate grounded answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // AI Exemplar Speech Synthesis
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
        const pauseMs = (seg.pause_after_sec || 0.4) * 1000;
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
    <div className="space-y-6">
      {/* Hero Grounding Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800/40 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-600/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Cpu className="w-3.5 h-3.5" />
                <span>Tree-Sitter AST + pgvector</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Cheat AI Evasion Engine</span>
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Repo & Resume Grounded Interview Studio
            </h2>
            <p className="text-indigo-200 text-sm mt-1 max-w-3xl leading-relaxed">
              We ingest your GitHub repository using <strong>Tree-Sitter AST parsing</strong> and generate dense code embeddings in <strong>pgvector</strong>. The interviewer probes your actual code: <em>“Why did you structure the cache this way?”</em> Generic AI assistants fail because they don’t know your code trade-offs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowResumeDrawer(!showResumeDrawer)}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/20 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>Resume Claims ({resumeClaims.length})</span>
            </button>

            <button
              onClick={() => setShowCustomRepoInput(!showCustomRepoInput)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Custom Code</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="mt-4 pt-4 border-t border-indigo-900/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">AST Engine</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              ✓ Tree-Sitter (Python / JS / TS)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Vector Embedding</span>
            <span className="text-indigo-300 font-semibold mt-0.5 block">
              384-dim SBERT (Cosine Index)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">pgvector DDL</span>
            <span className="text-slate-300 font-semibold mt-0.5 block">
              HNSW (vector_cosine_ops)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Anti-Cheat Mode</span>
            <span className="text-amber-300 font-semibold mt-0.5 block">
              Generic LLM Evasion Filter Active
            </span>
          </div>
        </div>
      </div>

      {/* Custom Repo Ingestion Drawer / Panel */}
      {showCustomRepoInput && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Ingest Candidate Repository with Tree-Sitter & pgvector
              </h3>
            </div>
            <button
              onClick={() => setShowCustomRepoInput(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Repository / Project Name
              </label>
              <input
                type="text"
                value={customRepoName}
                onChange={(e) => setCustomRepoName(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="e.g. acme-corp/distributed-cache"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Primary Language Grammars
              </label>
              <select
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="python">Python (tree-sitter-python)</option>
                <option value="javascript">JavaScript (tree-sitter-javascript)</option>
                <option value="typescript">TypeScript (tree-sitter-typescript)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Source Code Content (AST Symbol Extractor)
            </label>
            <textarea
              rows={8}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Paste Python, TypeScript, or JavaScript code here..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleParseCustomRepo}
              disabled={isParsingCustom}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {isParsingCustom ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing AST & Indexing pgvector...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Parse AST & Generate Grounded Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resume Claims Drawer / Panel */}
      {showResumeDrawer && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Resume Claims vs Repository AST Ground Truth
              </h3>
            </div>
            <button
              onClick={() => setShowResumeDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Candidate Resume Text (Experience & Claims)
              </label>
              <textarea
                rows={5}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 outline-none"
              />
              <button
                onClick={handleCrossReferenceResume}
                disabled={isCrossReferencingResume}
                className="mt-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                {isCrossReferencingResume ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                <span>Cross-Reference Against AST</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Extracted Claims & AST Verification Status:
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {resumeClaims.map((claim) => (
                  <div
                    key={claim.claim_id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      claim.verified
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px] flex items-center gap-1">
                        {claim.verified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Verified in AST</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-amber-700">Probing Opportunity (Unverified)</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {claim.target_file}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug">{claim.claim_text}</p>
                    {claim.unverified_reason && (
                      <p className="text-[10px] text-amber-800 font-mono mt-1 bg-amber-100/60 p-1 rounded">
                        Note: {claim.unverified_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Ingested Repo & Questions, Right = Interview Defense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Ingested Code & Questions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Repository Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Ingested Candidate Repositories
            </span>
            <div className="space-y-2">
              {repositories.map((repo) => (
                <button
                  key={repo.repo_id}
                  onClick={() => handleSelectRepo(repo.repo_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRepoId === repo.repo_id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{repo.repo_name}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                      {repo.primary_language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Tree-Sitter AST Structural Inspector */}
          {selectedRepo && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tree-Sitter AST & Symbol Inspector</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  AST Parsed
                </span>
              </div>

              {selectedRepo.files.map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-indigo-700">{f.file_path}</span>
                    <span className="text-slate-400 text-[10px]">{f.total_lines} lines</span>
                  </div>

                  {/* Classes & Functions */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-50/80 p-2 rounded border border-slate-100">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans font-bold">
                        AST Classes
                      </span>
                      {f.classes.map((c, ci) => (
                        <div key={ci} className="text-slate-800 font-semibold mt-0.5 truncate">
                          class {c.name} (L{c.start_line})
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50/80 p-2 rounded border border-slate-100">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans font-bold">
                        AST Methods
                      </span>
                      {f.functions.map((fn, fi) => (
                        <div key={fi} className="text-slate-800 font-semibold mt-0.5 truncate">
                          def {fn.name}() (L{fn.start_line})
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Architectural Patterns */}
                  <div className="space-y-1">
                    {f.patterns.map((p, pi) => (
                      <div
                        key={pi}
                        className="p-2 rounded bg-indigo-50/50 border border-indigo-100/70 text-[10px]"
                      >
                        <div className="font-bold text-indigo-900">{p.category}: {p.construct}</div>
                        <div className="text-slate-500 font-mono mt-0.5">
                          Risk check: {p.risk_areas.join(' • ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grounded Questions Selector */}
          {selectedRepo && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Grounded Probing Questions
              </span>
              {selectedRepo.grounded_questions.map((q) => (
                <button
                  key={q.question_id}
                  onClick={() => handleSelectQuestion(q.question_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedQuestionId === q.question_id
                      ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span className="font-semibold text-indigo-600">{q.category}</span>
                    <span>{q.line_range}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{q.title}</h4>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Grounded Interview Probing & Anti-Cheat Defense */}
        <div className="lg:col-span-7 space-y-5">
          {selectedQuestion ? (
            <>
              {/* Question Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-indigo-600" />
                    <span>{selectedQuestion.target_file} ({selectedQuestion.line_range})</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Probing Depth: Advanced
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedQuestion.question_text}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                    Context: {selectedQuestion.grounded_context}
                  </p>
                </div>

                {/* Key AST Primitives Required */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Required AST Code Primitives (Must Be Defended):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedQuestion.key_code_constructs.map((construct, i) => (
                      <span
                        key={i}
                        className="bg-slate-100 text-slate-700 text-xs font-mono font-medium px-2 py-0.5 rounded border border-slate-200"
                      >
                        {construct}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Anti-Cheat Rubric Note */}
                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-lg text-xs text-amber-900">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Anti-Cheat AI Evasion Detection:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed text-amber-950">
                    Generic ChatGPT answers (e.g., <em>“Caching is good for performance”</em>) will be flagged as <strong>Suspicious AI Evasion</strong>. You must explicitly justify why you used {selectedQuestion.key_code_constructs[0]} in your codebase.
                  </p>
                </div>
              </div>

              {/* Candidate Answer Studio */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your Spoken or Written Defense
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadSample('generic_ai_assistant')}
                      className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-200 transition-all"
                      title="Test detection on generic ChatGPT answers"
                    >
                      Load Generic AI Answer
                    </button>
                    <button
                      onClick={() => handleLoadSample('grounded_authentic')}
                      className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 transition-all"
                      title="Test detection on authentic senior defense"
                    >
                      Load Grounded Defense
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={candidateAnswer}
                    onChange={(e) => setCandidateAnswer(e.target.value)}
                    placeholder="Turn on your microphone or type your defense here. Justify why you structured the cache, mutex, or error retry loop in your repository..."
                    className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed transition-all"
                  />
                  {isRecording && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                      <Radio className="w-3 h-3" />
                      <span>LIVE MIC: {recordingSeconds}s</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Radio className="w-3.5 h-3.5 text-red-400" />
                        <span>Record Spoken Defense</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleRunEvaluation}
                    disabled={isEvaluating || !candidateAnswer.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Against AST Ground Truth...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Assess Grounding & Anti-Cheat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Assessment Results Card */}
              {assessmentResult && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-indigo-600" />
                      <span>Repo-Grounded Anti-Cheat Assessment</span>
                    </h3>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {assessmentResult.target_file} ({assessmentResult.line_range})
                    </span>
                  </div>

                  {/* Primary Scores Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Grounding Fidelity Score */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Repo Grounding Fidelity
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

                    {/* Anti-Cheat AI Evasion Risk */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-red-50/70 border-red-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Anti-Cheat AI Evasion Risk
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-2xl font-black ${
                            assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {assessmentResult.anti_cheat_analysis.ai_evasion_risk} Risk
                        </span>
                      </div>
                    </div>

                    {/* Architectural Defense Rating */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Architectural Defense Rating
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900">
                          {assessmentResult.architectural_defense_score}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Anti-Cheat Diagnostic Alert */}
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-red-50 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {assessmentResult.anti_cheat_analysis.ai_evasion_risk === 'Low' ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Authentic Engineering Defense Verified:</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-red-600" />
                          <span>Flagged: Generic AI-Assistant Response Signature:</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px]">
                      {assessmentResult.anti_cheat_analysis.diagnostic_note}
                    </p>
                  </div>

                  {/* Missing AST Constructs */}
                  {assessmentResult.pinpointed_deficits.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-900 block">
                        Pinpointed Code Deficits ({assessmentResult.pinpointed_deficits.length}):
                      </span>
                      <div className="space-y-1.5">
                        {assessmentResult.pinpointed_deficits.map((d, i) => (
                          <div
                            key={i}
                            className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-xs flex items-start gap-2"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-amber-900">
                                {d.construct}
                              </span>
                              <p className="text-[11px] text-amber-800 mt-0.5">{d.feedback}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI-Voiced Exemplar Audio Player */}
                  {assessmentResult.exemplar_defense && (
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 space-y-3 shadow-sm border border-indigo-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold text-xs text-white">
                            AI-Voiced Grounded Exemplar Defense
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPlaybackSpeed(playbackSpeed === 1.0 ? 1.1 : 1.0)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-indigo-200 transition-all"
                          >
                            {playbackSpeed}x Speed
                          </button>

                          <button
                            onClick={playExemplarWithPacing}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                              isPlayingExemplar
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isPlayingExemplar ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Hear Paced Defense (~140 WPM)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Sentence-by-sentence tracking */}
                      <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed font-sans bg-black/30 p-3 rounded-lg border border-white/5">
                        {assessmentResult.exemplar_defense.speech_segments.map((seg, idx) => (
                          <span
                            key={idx}
                            className={`transition-all duration-200 inline-block mr-1.5 ${
                              activeSegmentIndex === idx
                                ? 'bg-indigo-500/40 text-white font-semibold rounded px-1.5 py-0.5 border border-indigo-400/50'
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
            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Select a repository and question to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
