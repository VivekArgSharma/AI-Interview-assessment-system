import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Code2,
  TrendingUp,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Link2,
  Users,
  Award,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ApiService } from '../services/api';

interface InterviewerStudioPageProps {
  initialTrack?: 'tech' | 'sales';
  onSwitchToCandidate: () => void;
  onViewReportById?: (sessionId: string) => void;
}

interface QuestionFormItem {
  id: string;
  stage: string;
  question_text: string;
  correct_answer: string;
  key_concepts_text: string;
}

const DEFAULT_TECH_QUESTIONS: QuestionFormItem[] = [
  {
    id: '1',
    stage: 'Architecture & Idempotency',
    question_text: 'An API service starts returning duplicate records during network timeouts and retry storms. How do you isolate and resolve the root cause?',
    correct_answer: 'I isolate between the database and in-memory accumulator by inspecting telemetry logs. To prevent duplicate execution on retry storms, I enforce an idempotency key using Redis SETNX with TTL and ensure atomic deduplication.',
    key_concepts_text: 'idempotency key, Redis SETNX, retry storms, TTL, atomic deduplication'
  },
  {
    id: '2',
    stage: 'Distributed Concurrency',
    question_text: 'How would you design a distributed locking mechanism to prevent two worker nodes from processing the same event concurrently?',
    correct_answer: 'I would use Redis Redlock or Postgres advisory locks with lease timeouts and fencing tokens to ensure only one worker processes an event, preventing stale node overrides.',
    key_concepts_text: 'distributed lock, fencing token, lease timeout, Redlock, stale override'
  },
  {
    id: '3',
    stage: 'Rollout & Safeguards',
    question_text: 'What production rollout safeguards and telemetry alerts do you establish before deploying a distributed bug fix?',
    correct_answer: 'I employ canary deployment at 10% traffic, monitor p99 latency and 5xx error thresholds on Datadog, and configure automated circuit breaker rollbacks.',
    key_concepts_text: 'canary deployment, p99 latency, circuit breaker, automated rollback'
  }
];

const DEFAULT_SALES_QUESTIONS: QuestionFormItem[] = [
  {
    id: '1',
    stage: 'Objection Handling & Pricing',
    question_text: 'A prospective enterprise buyer says your SaaS platform is 30% more expensive than their incumbent solution. How do you handle this objection?',
    correct_answer: 'I validate their budget boundaries without discounting prematurely, then re-anchor discovery on total cost of ownership and time savings, showing our automation saves 15 hours per engineering sprint.',
    key_concepts_text: 'total cost of ownership, value re-anchoring, ROI, no premature discount'
  },
  {
    id: '2',
    stage: 'Stakeholder Retraining Fear',
    question_text: 'An executive stakeholder is hesitant to switch because of the perceived pain of team retraining. How do you address their fear?',
    correct_answer: 'I validate their concern, quantify the weekly friction of their legacy tool, and offer a dedicated concierge migration and shadowing program with zero downtime guarantees.',
    key_concepts_text: 'concierge onboarding, zero downtime, friction quantification, migration support'
  },
  {
    id: '3',
    stage: 'Mutual Commitment Closing',
    question_text: 'How do you establish mutual commitment to secure a signed contract before quarter close?',
    correct_answer: 'I anchor the signing deadline directly to the customer\'s internal product launch milestone so any delay in signature directly impacts their own business deliverable.',
    key_concepts_text: 'mutual action plan, go-live milestone, executive sponsor anchor, business deliverable'
  }
];

export const InterviewerStudioPage: React.FC<InterviewerStudioPageProps> = ({
  initialTrack = 'tech',
  onSwitchToCandidate,
  onViewReportById,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<'tech' | 'sales'>(initialTrack);
  const [title, setTitle] = useState<string>('Senior Software Engineer - Distributed Architecture Assessment');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [questions, setQuestions] = useState<QuestionFormItem[]>(DEFAULT_TECH_QUESTIONS);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdInterview, setCreatedInterview] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [createdList, setCreatedList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [submissionsModal, setSubmissionsModal] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCreatedInterviews();
  }, [selectedTrack]);

  const loadCreatedInterviews = async () => {
    setIsLoadingList(true);
    try {
      const data = await ApiService.getCustomInterviews(selectedTrack);
      setCreatedList(data);
    } catch (e) {
      console.error('Failed to load created interviews:', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleTrackChange = (track: 'tech' | 'sales') => {
    setSelectedTrack(track);
    if (track === 'tech') {
      setTitle('Senior Software Engineer - Distributed Architecture Assessment');
      setQuestions(DEFAULT_TECH_QUESTIONS);
    } else {
      setTitle('Enterprise Account Executive - Consultative Negotiation');
      setQuestions(DEFAULT_SALES_QUESTIONS);
    }
    setCreatedInterview(null);
  };

  const handleAddQuestion = () => {
    const newId = (questions.length + 1).toString();
    setQuestions([
      ...questions,
      {
        id: newId,
        stage: `Stage ${questions.length + 1}`,
        question_text: '',
        correct_answer: '',
        key_concepts_text: ''
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionFormItem, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!title.trim()) {
      setErrorMsg('Please specify an interview title.');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        setErrorMsg(`Question #${i + 1} text cannot be empty.`);
        return;
      }
      if (!questions[i].correct_answer.trim()) {
        setErrorMsg(`Question #${i + 1} requires a model correct answer for semantic comparison.`);
        return;
      }
    }

    setIsCreating(true);
    try {
      const payload = {
        title: title.trim(),
        track: selectedTrack,
        duration_minutes: durationMinutes,
        questions: questions.map((q) => ({
          stage: q.stage.trim(),
          question_text: q.question_text.trim(),
          correct_answer: q.correct_answer.trim(),
          key_concepts: q.key_concepts_text
            ? q.key_concepts_text.split(',').map((c) => c.trim()).filter(Boolean)
            : []
        }))
      };

      const res = await ApiService.createCustomInterview(payload);
      setCreatedInterview(res);
      await loadCreatedInterviews();
    } catch (err: any) {
      console.error('Failed to create interview:', err);
      setErrorMsg(err.message || 'Failed to create interview.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleInspectSubmissions = async (roleId: string) => {
    try {
      const data = await ApiService.getCustomInterviewSubmissions(roleId);
      setSubmissionsModal(data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-8 space-y-10 font-sans">
      {/* Top Banner / Role Switcher */}
      <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-none">
              Interviewer & Examiner Studio
            </span>
            <span className="text-xs text-stone-500 font-medium">Custom Question Authoring & Semantic Scoring</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Create Custom Interview & Generate Candidate Link
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl">
            Choose between <strong>Tech</strong> and <strong>Sales</strong> tracks. Author your questions and model correct answers.
            Our Sentence-BERT engine will automatically derive semantic meaning and score candidate responses against your standards.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={onSwitchToCandidate}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-none border border-stone-300 transition-colors flex items-center gap-2"
          >
            <span>Switch to Candidate Mode</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Track Selection Switcher: Tech vs Sales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleTrackChange('tech')}
          className={`p-6 rounded-none border text-left transition-all flex items-start gap-4 ${
            selectedTrack === 'tech'
              ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-none flex items-center justify-center shrink-0 ${
              selectedTrack === 'tech'
                ? 'bg-orange-600 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            <Code2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-stone-900">Technical Track (Software Engineering)</span>
              {selectedTrack === 'tech' && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-none bg-orange-100 text-orange-800 uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Distributed systems, idempotency keys, race conditions, architecture trade-offs, and debugging triage.
            </p>
          </div>
        </button>

        <button
          onClick={() => handleTrackChange('sales')}
          className={`p-6 rounded-none border text-left transition-all flex items-start gap-4 ${
            selectedTrack === 'sales'
              ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-none flex items-center justify-center shrink-0 ${
              selectedTrack === 'sales'
                ? 'bg-orange-600 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-stone-900">Sales Track (Consultative Negotiation)</span>
              {selectedTrack === 'sales' && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-none bg-orange-100 text-orange-800 uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Price objection handling, value proposition framing, executive de-escalation, and mutual closing plans.
            </p>
          </div>
        </button>
      </div>

      {/* Generated Link Card Notification */}
      {createdInterview && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-none p-6 sm:p-8 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Custom Interview Created Successfully!
                </h3>
                <p className="text-xs text-emerald-700">
                  Share this invite code or full URL with candidates. Their answers will be semantically scored against your typed model answers.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-emerald-200 text-emerald-900 rounded-none uppercase">
              {createdInterview.track} Track
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Invite Code Box */}
            <div className="p-4 bg-white border border-emerald-200 rounded-none flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Candidate 6-Character Invite Code
                </span>
                <span className="text-2xl font-mono font-extrabold text-stone-900 tracking-wider">
                  {createdInterview.invite_code}
                </span>
              </div>
              <button
                onClick={() => handleCopy(createdInterview.invite_code, 'code')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Direct Link Box */}
            <div className="p-4 bg-white border border-emerald-200 rounded-none flex items-center justify-between">
              <div className="overflow-hidden mr-3">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Direct Shareable Link
                </span>
                <span className="text-xs font-mono font-semibold text-stone-700 truncate block">
                  {window.location.origin}/?invite={createdInterview.invite_code}
                </span>
              </div>
              <button
                onClick={() =>
                  handleCopy(`${window.location.origin}/?invite=${createdInterview.invite_code}`, 'link')
                }
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-none text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Authoring Form */}
      <form onSubmit={handleCreateInterview} className="space-y-8">
        <div className="bg-white border border-stone-200 rounded-none p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 uppercase tracking-tight">
                1. Assessment Metadata & Track Configuration
              </h2>
              <p className="text-xs text-stone-500">
                Define the role title and duration. Candidates will see this when entering their invite code.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-stone-100 text-stone-700 border border-stone-200 uppercase font-bold">
              Track: {selectedTrack}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                Interview Title / Role Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Cloud & Concurrency Assessment"
                className="w-full px-4 py-3 border border-stone-300 rounded-none text-xs font-semibold focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                Expected Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 border border-stone-300 rounded-none text-xs font-semibold focus:border-orange-500 focus:outline-none bg-white"
              >
                <option value={10}>10 Minutes (Quick Screen)</option>
                <option value={15}>15 Minutes (Standard Technical)</option>
                <option value={20}>20 Minutes (In-Depth Architecture)</option>
                <option value={30}>30 Minutes (Comprehensive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions and Correct Answers List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900 uppercase tracking-tight">
                2. Set Questions & Model Correct Answers ({questions.length})
              </h2>
              <p className="text-xs text-stone-500">
                Type the question and the exact correct answer standard. The candidate's response will be semantically matched with Sentence-BERT.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-none border border-stone-300 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-orange-600" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs space-y-5 hover:border-orange-400 transition-colors relative"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-stone-900 text-white font-mono font-bold text-xs flex items-center justify-center rounded-none">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={q.stage}
                      onChange={(e) => handleQuestionChange(idx, 'stage', e.target.value)}
                      placeholder="Stage / Category name"
                      className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 border border-orange-200 rounded-none focus:outline-none"
                    />
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Question Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                    Question Text (What the candidate is asked)
                  </label>
                  <textarea
                    rows={2}
                    value={q.question_text}
                    onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                    placeholder="Enter the scenario or technical prompt..."
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                {/* Model Correct Answer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Model Correct Answer (Semantic Standard)</span>
                    </label>
                    <span className="text-[10px] text-stone-400">
                      Sentence-BERT cosine similarity target
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={q.correct_answer}
                    onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                    placeholder="Type the ideal candidate response, trade-offs, and architectural solutions..."
                    className="w-full px-4 py-2.5 bg-orange-50/20 border border-orange-200 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed text-stone-900"
                    required
                  />
                </div>

                {/* Key Concepts */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                    Required Key Concepts (Comma-separated keywords)
                  </label>
                  <input
                    type="text"
                    value={q.key_concepts_text}
                    onChange={(e) => handleQuestionChange(idx, 'key_concepts_text', e.target.value)}
                    placeholder="e.g. idempotency key, Redis SETNX, atomic check, TTL"
                    className="w-full px-4 py-2 border border-stone-300 rounded-none text-xs font-mono text-stone-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="submit"
            disabled={isCreating}
            className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-sm transition-colors flex items-center gap-2.5 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Candidate Invite...</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Create & Generate Candidate Interview Link</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Previously Created Custom Interviews */}
      <div className="bg-white border border-stone-200 rounded-none p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 uppercase tracking-tight">
              Active Created Interviews ({createdList.length})
            </h2>
            <p className="text-xs text-stone-500">
              Copy invite links for candidates and inspect their semantic match scores and completed reports.
            </p>
          </div>
        </div>

        {isLoadingList ? (
          <div className="p-12 text-center text-stone-500">
            <Loader2 className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
            <span className="text-xs font-bold uppercase">Loading created interviews...</span>
          </div>
        ) : createdList.length === 0 ? (
          <div className="p-8 text-center text-stone-500 border border-dashed border-stone-300">
            <p className="text-xs">No custom interviews created yet for this track. Use the form above to build one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Track</th>
                  <th className="py-3 px-4">Invite Code</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {createdList.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-4 font-bold text-stone-900 max-w-xs">
                      {item.title}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-none font-bold uppercase text-[10px] bg-orange-50 text-orange-800 border border-orange-200">
                        {item.track}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-stone-800">
                      {item.invite_code}
                    </td>
                    <td className="py-4 px-4 text-stone-600">
                      {item.questions_count} Stages
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 text-stone-800 font-mono font-bold">
                        {item.submissions_count} completed
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopy(`${window.location.origin}/?invite=${item.invite_code}`, 'link')}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[10px] uppercase rounded-none border border-stone-300"
                        title="Copy direct link"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleInspectSubmissions(item.role_id)}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-orange-600 text-white font-bold text-[10px] uppercase rounded-none transition-colors"
                      >
                        Submissions ({item.submissions_count})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      {submissionsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-none border border-stone-300 max-w-3xl w-full p-8 space-y-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 uppercase">
                  Candidate Submissions: {submissionsModal.title}
                </h3>
                <span className="text-xs text-stone-500">
                  Total Completed: {submissionsModal.total_submissions}
                </span>
              </div>
              <button
                onClick={() => setSubmissionsModal(null)}
                className="text-stone-400 hover:text-stone-800 text-xs font-bold uppercase"
              >
                Close ✕
              </button>
            </div>

            {submissionsModal.submissions.length === 0 ? (
              <div className="p-8 text-center text-stone-500 border border-dashed border-stone-300">
                <p className="text-xs">No candidate has submitted this interview yet. Share the invite link with a candidate to receive submissions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissionsModal.submissions.map((sub: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 border border-stone-200 bg-stone-50 rounded-none flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{sub.candidate_name}</h4>
                      <p className="text-xs text-stone-500">{sub.candidate_email} • {new Date(sub.completed_at).toLocaleDateString()}</p>
                      <p className="text-xs text-stone-600 mt-1 italic max-w-md">{sub.summary}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-stone-400 block">Score</span>
                        <span className="text-base font-bold text-stone-900 font-mono">
                          {sub.content_score.toFixed(1)}% ({sub.overall_score.toFixed(1)}/5.0)
                        </span>
                      </div>

                      {onViewReportById && (
                        <button
                          onClick={() => {
                            setSubmissionsModal(null);
                            onViewReportById(sub.session_id);
                          }}
                          className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase rounded-none"
                        >
                          View Report →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
