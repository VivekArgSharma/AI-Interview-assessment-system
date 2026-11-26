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
  ChevronRight,
  Code,
  Terminal,
  MessageSquare
} from 'lucide-react';
import { ApiService } from '../services/api';

interface InterviewerStudioPageProps {
  initialTrack?: 'tech' | 'sales';
  onSwitchToCandidate: () => void;
  onViewReportById?: (sessionId: string) => void;
}

interface TestCaseFormItem {
  id: string;
  input: string;
  expected_output: string;
}

interface QuestionFormItem {
  id: string;
  stage: string;
  question_type: 'verbal' | 'coding_bug_fix' | 'coding_leetcode';
  question_text: string;
  correct_answer: string;
  key_concepts_text: string;
  starter_code?: string;
  test_cases?: TestCaseFormItem[];
}

const DEFAULT_TECH_QUESTIONS: QuestionFormItem[] = [
  {
    id: '1',
    stage: 'Architecture & Idempotency',
    question_type: 'verbal',
    question_text: 'An API service starts returning duplicate records during network timeouts and retry storms. How do you isolate and resolve the root cause?',
    correct_answer: 'I isolate between the database and in-memory accumulator by inspecting telemetry logs. To prevent duplicate execution on retry storms, I enforce an idempotency key using Redis SETNX with TTL and ensure atomic deduplication.',
    key_concepts_text: 'idempotency key, Redis SETNX, retry storms, TTL, atomic deduplication'
  },
  {
    id: '2',
    stage: 'Live C++ Debugging (Bug Fix)',
    question_type: 'coding_bug_fix',
    question_text: 'The C++ function below is supposed to filter out all records with values less than a threshold. However, it contains an iterator invalidation bug and an off-by-one bounds check causing memory crashes. Fix the function so all test cases execute cleanly.',
    starter_code: `#include <iostream>
#include <vector>

// BUG: Erasing elements while incrementing iterator causes skips and out-of-bounds
std::vector<int> removeStaleAndDeduplicate(std::vector<int>& records, int threshold) {
    std::vector<int> result = records;
    for (size_t i = 0; i <= result.size(); ++i) {
        if (i < result.size() && result[i] < threshold) {
            result.erase(result.begin() + i);
        }
    }
    return result;
}

int main() {
    int n, threshold;
    if (!(std::cin >> n >> threshold)) return 0;
    std::vector<int> records(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> records[i];
    }
    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);
    for (size_t i = 0; i < filtered.size(); ++i) {
        std::cout << filtered[i] << (i + 1 == filtered.size() ? "" : " ");
    }
    std::cout << "\\n";
    return 0;
}`,
    correct_answer: `#include <iostream>
#include <vector>

std::vector<int> removeStaleAndDeduplicate(const std::vector<int>& records, int threshold) {
    std::vector<int> result;
    for (int val : records) {
        if (val >= threshold) {
            result.push_back(val);
        }
    }
    return result;
}

int main() {
    int n, threshold;
    if (!(std::cin >> n >> threshold)) return 0;
    std::vector<int> records(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> records[i];
    }
    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);
    for (size_t i = 0; i < filtered.size(); ++i) {
        std::cout << filtered[i] << (i + 1 == filtered.size() ? "" : " ");
    }
    std::cout << "\\n";
    return 0;
}`,
    key_concepts_text: 'iterator invalidation, vector erase, off-by-one, C++ memory safety',
    test_cases: [
      { id: 'tc1', input: '5 10\n5 12 8 15 20', expected_output: '12 15 20' },
      { id: 'tc2', input: '4 25\n5 10 15 20', expected_output: '' },
      { id: 'tc3', input: '3 1\n1 2 3', expected_output: '1 2 3' }
    ]
  },
  {
    id: '3',
    stage: 'Algorithms & Data Structures (LeetCode)',
    question_type: 'coding_leetcode',
    question_text: 'Given an integer array nums, find the contiguous subarray with the largest sum and return its sum (Kadane\'s Algorithm). Implement an optimal O(N) time and O(1) space solution in C++.',
    starter_code: `#include <iostream>
#include <vector>
#include <algorithm>

// Implement Kadane's Algorithm in C++: O(N) time, O(1) auxiliary space
long long maxSubArraySum(const std::vector<int>& nums) {
    // TODO: Write your solution here
    return 0;
}

int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    std::vector<int> nums(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> nums[i];
    }
    std::cout << maxSubArraySum(nums) << "\\n";
    return 0;
}`,
    correct_answer: `#include <iostream>
#include <vector>
#include <algorithm>

long long maxSubArraySum(const std::vector<int>& nums) {
    if (nums.empty()) return 0;
    long long current_sum = nums[0];
    long long max_sum = nums[0];
    for (size_t i = 1; i < nums.size(); ++i) {
        current_sum = std::max((long long)nums[i], current_sum + nums[i]);
        max_sum = std::max(max_sum, current_sum);
    }
    return max_sum;
}

int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    std::vector<int> nums(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> nums[i];
    }
    std::cout << maxSubArraySum(nums) << "\\n";
    return 0;
}`,
    key_concepts_text: 'Kadane algorithm, dynamic programming, O(N) time, O(1) space',
    test_cases: [
      { id: 'tc1', input: '9\n-2 1 -3 4 -1 2 1 -5 4', expected_output: '6' },
      { id: 'tc2', input: '5\n5 4 -1 7 8', expected_output: '23' },
      { id: 'tc3', input: '1\n-1', expected_output: '-1' }
    ]
  },
  {
    id: '4',
    stage: 'Rollout & Safeguards',
    question_type: 'verbal',
    question_text: 'What production rollback safeguards and telemetry alerts do you establish before deploying a distributed bug fix?',
    correct_answer: 'I employ canary deployment at 10% traffic, monitor p99 latency and 5xx error thresholds on Datadog, and configure automated circuit breaker rollbacks.',
    key_concepts_text: 'canary deployment, p99 latency, circuit breaker, automated rollback'
  }
];

const DEFAULT_SALES_QUESTIONS: QuestionFormItem[] = [
  {
    id: '1',
    stage: 'Objection Handling & Pricing',
    question_type: 'verbal',
    question_text: 'A prospective enterprise buyer says your SaaS platform is 30% more expensive than their incumbent solution. How do you handle this objection?',
    correct_answer: 'I validate their budget boundaries without discounting prematurely, then re-anchor discovery on total cost of ownership and time savings, showing our automation saves 15 hours per engineering sprint.',
    key_concepts_text: 'total cost of ownership, value re-anchoring, ROI, no premature discount'
  },
  {
    id: '2',
    stage: 'Stakeholder Retraining Fear',
    question_type: 'verbal',
    question_text: 'An executive stakeholder is hesitant to switch because of the perceived pain of team retraining. How do you address their fear?',
    correct_answer: 'I validate their concern, quantify the weekly friction of their legacy tool, and offer a dedicated concierge migration and shadowing program with zero downtime guarantees.',
    key_concepts_text: 'concierge onboarding, zero downtime, friction quantification, migration support'
  },
  {
    id: '3',
    stage: 'Mutual Commitment Closing',
    question_type: 'verbal',
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

  // JD-to-Rubric AI Generator State
  const [jdText, setJdText] = useState<string>('');
  const [isGeneratingFromJd, setIsGeneratingFromJd] = useState<boolean>(false);
  const [jdSuccessMsg, setJdSuccessMsg] = useState<string | null>(null);
  const [targetCompetencies, setTargetCompetencies] = useState<Array<{ name: string; target_score: number; weight: number }>>([]);

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

  const handleAddQuestion = (type: 'verbal' | 'coding_bug_fix' | 'coding_leetcode' = 'verbal') => {
    const newId = (questions.length + 1).toString();
    let newQ: QuestionFormItem;

    if (type === 'coding_bug_fix') {
      newQ = {
        id: newId,
        stage: `Stage ${questions.length + 1}: Live C++ Debugging`,
        question_type: 'coding_bug_fix',
        question_text: 'Fix the bug in the C++ function below so that it executes cleanly without memory corruption or bounds crashes.',
        starter_code: DEFAULT_TECH_QUESTIONS[1].starter_code,
        correct_answer: DEFAULT_TECH_QUESTIONS[1].correct_answer,
        key_concepts_text: 'iterator invalidation, vector bounds, C++ memory safety',
        test_cases: [
          { id: `tc_${Date.now()}_1`, input: '5 10\n5 12 8 15 20', expected_output: '12 15 20' },
          { id: `tc_${Date.now()}_2`, input: '3 1\n1 2 3', expected_output: '1 2 3' }
        ]
      };
    } else if (type === 'coding_leetcode') {
      newQ = {
        id: newId,
        stage: `Stage ${questions.length + 1}: C++ LeetCode Problem`,
        question_type: 'coding_leetcode',
        question_text: 'Given an input array, implement the optimal C++ solution adhering to O(N) time complexity.',
        starter_code: DEFAULT_TECH_QUESTIONS[2].starter_code,
        correct_answer: DEFAULT_TECH_QUESTIONS[2].correct_answer,
        key_concepts_text: 'dynamic programming, Kadane algorithm, O(1) auxiliary space',
        test_cases: [
          { id: `tc_${Date.now()}_1`, input: '9\n-2 1 -3 4 -1 2 1 -5 4', expected_output: '6' },
          { id: `tc_${Date.now()}_2`, input: '5\n5 4 -1 7 8', expected_output: '23' }
        ]
      };
    } else {
      newQ = {
        id: newId,
        stage: `Stage ${questions.length + 1}: Technical / Architecture Assessment`,
        question_type: 'verbal',
        question_text: '',
        correct_answer: '',
        key_concepts_text: ''
      };
    }

    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionFormItem, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleQuestionTypeChange = (index: number, newType: 'verbal' | 'coding_bug_fix' | 'coding_leetcode') => {
    const updated = [...questions];
    const current = updated[index];
    if (newType === 'coding_bug_fix') {
      current.question_type = 'coding_bug_fix';
      current.stage = current.stage || 'Live C++ Debugging (Bug Fix)';
      if (!current.starter_code) {
        current.starter_code = DEFAULT_TECH_QUESTIONS[1].starter_code;
        current.correct_answer = DEFAULT_TECH_QUESTIONS[1].correct_answer;
        current.question_text = current.question_text || DEFAULT_TECH_QUESTIONS[1].question_text;
        current.test_cases = DEFAULT_TECH_QUESTIONS[1].test_cases;
      }
    } else if (newType === 'coding_leetcode') {
      current.question_type = 'coding_leetcode';
      current.stage = current.stage || 'Algorithms & Data Structures (LeetCode)';
      if (!current.starter_code) {
        current.starter_code = DEFAULT_TECH_QUESTIONS[2].starter_code;
        current.correct_answer = DEFAULT_TECH_QUESTIONS[2].correct_answer;
        current.question_text = current.question_text || DEFAULT_TECH_QUESTIONS[2].question_text;
        current.test_cases = DEFAULT_TECH_QUESTIONS[2].test_cases;
      }
    } else {
      current.question_type = 'verbal';
    }
    setQuestions(updated);
  };

  const handleAddTestCase = (qIdx: number) => {
    const updated = [...questions];
    const currentQ = updated[qIdx];
    const currentTC = currentQ.test_cases || [];
    currentQ.test_cases = [
      ...currentTC,
      { id: `tc_${Date.now()}`, input: '', expected_output: '' }
    ];
    setQuestions(updated);
  };

  const handleRemoveTestCase = (qIdx: number, tcIdx: number) => {
    const updated = [...questions];
    const currentQ = updated[qIdx];
    if (!currentQ.test_cases || currentQ.test_cases.length <= 1) return;
    currentQ.test_cases = currentQ.test_cases.filter((_, i) => i !== tcIdx);
    setQuestions(updated);
  };

  const handleTestCaseChange = (
    qIdx: number,
    tcIdx: number,
    field: 'input' | 'expected_output',
    val: string
  ) => {
    const updated = [...questions];
    const currentQ = updated[qIdx];
    if (!currentQ.test_cases) return;
    const tcList = [...currentQ.test_cases];
    tcList[tcIdx] = { ...tcList[tcIdx], [field]: val };
    currentQ.test_cases = tcList;
    setQuestions(updated);
  };

  const handleGenerateFromJD = async () => {
    if (!jdText.trim()) {
      setErrorMsg('Please paste a Job Description (JD) first.');
      return;
    }
    setIsGeneratingFromJd(true);
    setErrorMsg(null);
    setJdSuccessMsg(null);
    try {
      const generated = await ApiService.generateInterviewFromJD({
        job_description: jdText.trim(),
        track: selectedTrack,
        duration_minutes: durationMinutes
      });

      if (generated.title) setTitle(generated.title);
      if (generated.duration_minutes) setDurationMinutes(generated.duration_minutes);
      if (generated.target_competencies) setTargetCompetencies(generated.target_competencies);

      if (generated.questions && generated.questions.length > 0) {
        setQuestions(generated.questions.map((q, idx) => ({
          id: (idx + 1).toString(),
          stage: q.stage,
          question_type: q.question_type,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          key_concepts_text: Array.isArray(q.key_concepts) ? q.key_concepts.join(', ') : '',
          starter_code: q.starter_code || '',
          test_cases: q.test_cases?.map((tc, tcIdx) => ({
            id: `tc_${Date.now()}_${tcIdx}`,
            input: tc.input,
            expected_output: tc.expected_output
          }))
        })));
      }
      setJdSuccessMsg(`Generated ${generated.questions.length} tailored interview stages (verbal, bug fix, LeetCode C++) and ${generated.target_competencies?.length || 5} competency radar targets!`);
    } catch (err: any) {
      console.error('Failed to generate from JD:', err);
      setErrorMsg(err.message || 'Failed to auto-generate interview from Job Description.');
    } finally {
      setIsGeneratingFromJd(false);
    }
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
      if (questions[i].question_type !== 'verbal' && (!questions[i].test_cases || questions[i].test_cases!.length === 0)) {
        setErrorMsg(`Coding Question #${i + 1} must include at least one test case.`);
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
            : [],
          question_type: q.question_type || 'verbal',
          starter_code: q.starter_code || '',
          test_cases: q.test_cases
            ? q.test_cases.map((tc) => ({
                input: tc.input,
                expected_output: tc.expected_output
              }))
            : []
        })),
        target_competencies: targetCompetencies
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

      {/* AI JD-to-Rubric & Skill Radar Generator */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-orange-500/30 rounded-none p-6 sm:p-8 shadow-md text-white space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-orange-600 text-white font-mono">
                AI Recruiter Magic
              </span>
              <span className="text-xs text-stone-400 font-mono">1-Click Synthesis</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Job Description (JD) to Interview Rubric & Competency Radar</span>
            </h3>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Paste any raw Job Description below. Our LLM agent extracts core competencies, establishes target benchmark radar polygons, and auto-generates balanced verbal questions, live C++ bug-fix drills, and algorithmic LeetCode challenges in 3 seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block w-full md:w-auto">
              Sample Templates:
            </span>
            <button
              type="button"
              onClick={() => {
                setJdText(`Staff Backend Infrastructure Engineer:
We are looking for a Staff Backend Engineer to scale our distributed payment rails.
Key responsibilities:
- Design fault-tolerant distributed transaction processing handling 100k+ RPS.
- Ensure strict idempotency, deadlock avoidance, and concurrency control.
- Optimize high-throughput PostgreSQL and Redis caching layers.
- Triage critical production memory leaks, iterator invalidation bugs, and latency spikes.`);
              }}
              className="text-[10px] font-mono px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-orange-300 border border-stone-700 transition-colors"
            >
              Staff Backend (Stripe)
            </button>
            <button
              type="button"
              onClick={() => {
                setJdText(`Enterprise Account Executive - Strategic Cloud Accounts:
Looking for a top-performing Enterprise AE to lead strategic multimillion-dollar software sales.
Key responsibilities:
- Lead consultative sales cycles across Fortune 500 C-suite stakeholders.
- Execute mutual closing plans, value-based ROI modeling, and complex contract negotiations.
- Overcome aggressive procurement price objections and executive hesitation.
- Partner with technical solutions architects to de-escalate competitive bake-offs.`);
              }}
              className="text-[10px] font-mono px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-orange-300 border border-stone-700 transition-colors"
            >
              Enterprise AE (Datadog)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={4}
            placeholder="Paste Job Description text here (e.g. Senior Backend Engineer with Distributed Systems, C++, High Concurrency, Microservices...)..."
            className="w-full text-xs font-mono bg-stone-950 border border-stone-700 rounded-none p-3.5 text-stone-200 placeholder-stone-500 focus:border-orange-500 focus:outline-none resize-none"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-stone-400">
              {targetCompetencies.length > 0 && (
                <span className="text-emerald-400 font-bold font-mono">
                  ✓ {targetCompetencies.length} Benchmark Competency Targets Established for Spider Radar
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerateFromJD}
              disabled={isGeneratingFromJd || !jdText.trim()}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              {isGeneratingFromJd ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Rubric & Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Generate Interview & Rubric</span>
                </>
              )}
            </button>
          </div>
        </div>

        {jdSuccessMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 rounded-none text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{jdSuccessMsg}</span>
          </div>
        )}
      </div>

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
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 bg-stone-100 text-stone-700 border border-stone-200">
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </span>
              <button
                type="button"
                onClick={() => handleAddQuestion(selectedTrack === 'tech' ? 'coding_bug_fix' : 'verbal')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-1.5"
                title="Add another question to this assessment"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs space-y-5 hover:border-orange-400 transition-colors relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-3 gap-3">
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

                  <div className="flex items-center gap-2">
                    {/* Track-dependent question format selector */}
                    {selectedTrack === 'tech' && (
                      <div className="flex items-center border border-stone-300 rounded-none overflow-hidden bg-stone-100 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(idx, 'verbal')}
                          className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                            q.question_type === 'verbal'
                              ? 'bg-white text-orange-700 shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Verbal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(idx, 'coding_bug_fix')}
                          className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                            q.question_type === 'coding_bug_fix'
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <Terminal className="w-3 h-3" />
                          <span>C++ Bug Fix</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(idx, 'coding_leetcode')}
                          className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                            q.question_type === 'coding_leetcode'
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          <span>C++ LeetCode</span>
                        </button>
                      </div>
                    )}

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors ml-2"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* 1. VERBAL QUESTION FORMAT */}
                {/* ============================================================== */}
                {(!q.question_type || q.question_type === 'verbal') && (
                  <div className="space-y-5">
                    {/* Question Prompt */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                        Question Text (What the candidate is asked)
                      </label>
                      <textarea
                        rows={4}
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                        placeholder="Enter the scenario or technical prompt..."
                        className="w-full px-4 py-3 border border-stone-300 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed min-h-[100px]"
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
                        rows={5}
                        value={q.correct_answer}
                        onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                        placeholder="Type the ideal candidate response, trade-offs, and architectural solutions..."
                        className="w-full px-4 py-3 bg-orange-50/20 border border-orange-200 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed text-stone-900 min-h-[120px]"
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
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-none text-xs font-mono text-stone-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* 2. C++ BUG FIX FORMAT: SIDE-BY-SIDE BUGGY VS CORRECT WINDOWS */}
                {/* ============================================================== */}
                {q.question_type === 'coding_bug_fix' && (
                  <div className="space-y-6">
                    {/* Problem Statement & Bug Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-orange-600" />
                          <span>Bug Fix Problem Description & Symptoms (Candidate Instructions)</span>
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-100 text-orange-800 font-bold border border-orange-200">
                          GCC 15 • C++20
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                        placeholder="Explain what the function does, what bug exists (e.g. iterator invalidation, off-by-one, memory leak), and what the candidate must fix..."
                        className="w-full px-4 py-3 border border-stone-300 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed min-h-[100px]"
                        required
                      />
                    </div>

                    {/* SIDE-BY-SIDE CODE WINDOWS: BUGGED CODE vs CORRECT WORKING CODE */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                          Side-by-Side Code Windows: Buggy Starter vs. Correct Reference
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Candidate sees the buggy code on left; test cases validate against the correct logic.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* WINDOW 1: Buggy / Flawed Code */}
                        <div className="border border-rose-300 rounded-none bg-stone-950 overflow-hidden shadow-xs flex flex-col">
                          <div className="px-4 py-2.5 bg-rose-950/70 border-b border-rose-800/60 flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2 text-rose-300 font-bold">
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-none inline-block animate-pulse" />
                              <span className="uppercase">1. Buggy Code (Given to Candidate)</span>
                            </div>
                            <span className="text-[10px] text-rose-300/80 font-sans">Contains bug</span>
                          </div>
                          <textarea
                            rows={16}
                            value={q.starter_code || ''}
                            onChange={(e) => handleQuestionChange(idx, 'starter_code', e.target.value)}
                            placeholder="// Paste buggy C++ code here..."
                            spellCheck={false}
                            className="w-full bg-stone-950 text-rose-200 font-mono text-xs p-4 focus:outline-none resize-y leading-relaxed min-h-[380px]"
                            required
                          />
                        </div>

                        {/* WINDOW 2: Correct / Working Reference Code */}
                        <div className="border border-emerald-300 rounded-none bg-stone-950 overflow-hidden shadow-xs flex flex-col">
                          <div className="px-4 py-2.5 bg-emerald-950/70 border-b border-emerald-800/60 flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-none inline-block" />
                              <span className="uppercase">2. Correct Reference Code (Model Solution)</span>
                            </div>
                            <span className="text-[10px] text-emerald-300/80 font-sans">Working target</span>
                          </div>
                          <textarea
                            rows={16}
                            value={q.correct_answer}
                            onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                            placeholder="// Paste clean fixed working C++ code here..."
                            spellCheck={false}
                            className="w-full bg-stone-950 text-emerald-300 font-mono text-xs p-4 focus:outline-none resize-y leading-relaxed min-h-[380px]"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Test Cases Manager for Bug Fix */}
                    <div className="space-y-3 pt-2 p-5 bg-stone-50 border border-stone-200 rounded-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                            Automated Test Cases for Bug Fix (stdin → stdout)
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Candidate's fixed solution must pass these input/output checks.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTestCase(idx)}
                          className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold uppercase tracking-wider border border-stone-300 rounded-none flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-orange-600" />
                          <span>Add Test Case</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(q.test_cases || []).map((tc, tcIdx) => (
                          <div
                            key={tc.id || tcIdx}
                            className="p-4 bg-white border border-stone-200 rounded-none grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                          >
                            <div className="md:col-span-1 flex items-center gap-1 pt-2">
                              <span className="text-xs font-mono font-bold text-stone-500">
                                #{tcIdx + 1}
                              </span>
                            </div>

                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                                Input (stdin)
                              </label>
                              <textarea
                                rows={3}
                                value={tc.input}
                                onChange={(e) =>
                                  handleTestCaseChange(idx, tcIdx, 'input', e.target.value)
                                }
                                placeholder="e.g. 5 10\n5 12 8 15 20"
                                className="w-full px-3 py-2 font-mono text-xs border border-stone-300 rounded-none focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                                Expected Output (stdout)
                              </label>
                              <textarea
                                rows={3}
                                value={tc.expected_output}
                                onChange={(e) =>
                                  handleTestCaseChange(idx, tcIdx, 'expected_output', e.target.value)
                                }
                                placeholder="e.g. 12 15 20"
                                className="w-full px-3 py-2 font-mono text-xs border border-stone-300 rounded-none focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-end pt-2">
                              {(q.test_cases?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTestCase(idx, tcIdx)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                                  title="Delete test case"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                        placeholder="e.g. iterator invalidation, vector erase, bounds check, memory safety"
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-none text-xs font-mono text-stone-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* 3. C++ LEETCODE ALGORITHM FORMAT: PROBLEM + BOILERPLATE + TESTS */}
                {/* ============================================================== */}
                {q.question_type === 'coding_leetcode' && (
                  <div className="space-y-6">
                    {/* LeetCode Problem Statement & Constraints */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                          <Code className="w-4 h-4 text-orange-600" />
                          <span>LeetCode Problem Statement, Constraints & Target Complexity</span>
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-900 text-white font-bold">
                          LeetCode Style Challenge
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                        placeholder="Type the full problem description, example inputs/outputs, constraints, and asymptotic complexity goals:&#10;&#10;e.g. Given an integer array nums, find the contiguous subarray with the largest sum and return its sum.&#10;&#10;Constraints:&#10;• 1 <= nums.length <= 10^5&#10;• Target: O(N) time and O(1) auxiliary space."
                        className="w-full px-4 py-3 border border-stone-300 rounded-none text-xs font-medium focus:border-orange-500 focus:outline-none leading-relaxed min-h-[140px]"
                        required
                      />
                    </div>

                    {/* Candidate Starter Code (Boilerplate / Function Signature) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          Candidate Starter Code (C++ Boilerplate & Function Signature)
                        </label>
                        <span className="text-[10px] text-stone-500">
                          What candidate begins with in their editor
                        </span>
                      </div>
                      <textarea
                        rows={11}
                        value={q.starter_code || ''}
                        onChange={(e) => handleQuestionChange(idx, 'starter_code', e.target.value)}
                        placeholder="#include <iostream>&#10;#include <vector>&#10;&#10;// Write signature here..."
                        spellCheck={false}
                        className="w-full px-4 py-3 bg-stone-950 text-emerald-400 font-mono text-xs border border-stone-800 rounded-none focus:border-orange-500 focus:outline-none leading-relaxed min-h-[240px]"
                        required
                      />
                    </div>

                    {/* Optimal Reference Working Solution */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Optimal Reference Working Solution (C++20 Model Answer)</span>
                        </label>
                        <span className="text-[10px] text-stone-400">
                          Used for candidate report comparison
                        </span>
                      </div>
                      <textarea
                        rows={13}
                        value={q.correct_answer}
                        onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                        placeholder="#include <iostream>&#10;// Full working C++ solution..."
                        spellCheck={false}
                        className="w-full px-4 py-3 bg-stone-900 border border-stone-700 text-amber-300 font-mono text-xs rounded-none focus:border-orange-500 focus:outline-none leading-relaxed min-h-[280px]"
                        required
                      />
                    </div>

                    {/* LeetCode Automated Test Cases Manager */}
                    <div className="space-y-3 pt-2 p-5 bg-stone-50 border border-stone-200 rounded-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                            LeetCode Test Cases (stdin → stdout)
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Candidate's solution will be executed against each input with a 4-second runtime limit.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTestCase(idx)}
                          className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold uppercase tracking-wider border border-stone-300 rounded-none flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-orange-600" />
                          <span>Add Test Case</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(q.test_cases || []).map((tc, tcIdx) => (
                          <div
                            key={tc.id || tcIdx}
                            className="p-4 bg-white border border-stone-200 rounded-none grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                          >
                            <div className="md:col-span-1 flex items-center gap-1 pt-2">
                              <span className="text-xs font-mono font-bold text-stone-500">
                                #{tcIdx + 1}
                              </span>
                            </div>

                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                                Input (stdin)
                              </label>
                              <textarea
                                rows={3}
                                value={tc.input}
                                onChange={(e) =>
                                  handleTestCaseChange(idx, tcIdx, 'input', e.target.value)
                                }
                                placeholder="e.g. 9\n-2 1 -3 4 -1 2 1 -5 4"
                                className="w-full px-3 py-2 font-mono text-xs border border-stone-300 rounded-none focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                                Expected Output (stdout)
                              </label>
                              <textarea
                                rows={3}
                                value={tc.expected_output}
                                onChange={(e) =>
                                  handleTestCaseChange(idx, tcIdx, 'expected_output', e.target.value)
                                }
                                placeholder="e.g. 6"
                                className="w-full px-3 py-2 font-mono text-xs border border-stone-300 rounded-none focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-end pt-2">
                              {(q.test_cases?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTestCase(idx, tcIdx)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                                  title="Delete test case"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                        placeholder="e.g. Kadane algorithm, dynamic programming, O(N) time, O(1) space"
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-none text-xs font-mono text-stone-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Prominent "+ Add More Questions" Section at Bottom of Questions List */}
          <div className="bg-stone-50 border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-none p-6 sm:p-8 text-center space-y-4 transition-colors">
            <div className="max-w-md mx-auto space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                Add More Questions ({questions.length} Currently Configured)
              </span>
              <p className="text-[11px] text-stone-500">
                You can add as many verbal questions or C++ coding tests as you like. Candidates will complete them in sequential order.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('verbal')}
                className="px-5 py-3 bg-white hover:bg-orange-50 border border-stone-300 hover:border-orange-500 text-stone-900 hover:text-orange-700 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-2 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <MessageSquare className="w-4 h-4 text-stone-500" />
                <span>+ Add Verbal Question</span>
              </button>

              {selectedTrack === 'tech' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('coding_bug_fix')}
                    className="px-5 py-3 bg-white hover:bg-orange-50 border border-stone-300 hover:border-orange-500 text-stone-900 hover:text-orange-700 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                    <Terminal className="w-4 h-4 text-rose-600" />
                    <span>+ Add C++ Bug Fix Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddQuestion('coding_leetcode')}
                    className="px-5 py-3 bg-white hover:bg-orange-50 border border-stone-300 hover:border-orange-500 text-stone-900 hover:text-orange-700 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                    <Code className="w-4 h-4 text-stone-900" />
                    <span>+ Add C++ LeetCode Problem</span>
                  </button>
                </>
              )}
            </div>
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
