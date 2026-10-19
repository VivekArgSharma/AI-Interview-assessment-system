import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Cpu,
  BarChart,
  ShieldCheck,
  Mic,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

import { SessionQuestionRecord, InterviewSession } from '../types';
import { ScoreGauge } from '../components/ScoreGauge';
import { RubricCard } from '../components/RubricCard';
import { AudioAnalysisCard } from '../components/AudioAnalysisCard';

interface ReportPageProps {
  session: InterviewSession;
  questionIndex: number;
  onNavigateQuestion: (index: number) => void;
  onBackToWorkspace: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  session,
  questionIndex,
  onNavigateQuestion,
  onBackToWorkspace,
}) => {
  const records = session.records || [];
  const record: SessionQuestionRecord = records[questionIndex] || {};
  const assessment = record?.assessment;
  const question = record?.question;
  const audioAnalysis = assessment?.audio_analysis || record?.audioAnalysis;
  const isSpokenMode = record?.mode === 'audio' || !!audioAnalysis;

  if (!assessment || !question) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-900">No Assessment Data Found</h3>
        <p className="text-sm text-slate-500">
          This question has not been submitted or assessed yet. Please return to the workspace.
        </p>
        <button
          onClick={onBackToWorkspace}
          className="px-5 py-2.5 rounded-none bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider shadow-xs"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  // Chart data for measured metrics (0-10 scale)
  const chartData = [
    {
      name: 'Content Quality',
      score: assessment.content_score || 0,
      benchmark: 8.0,
      color: '#0f172a',
    },
    {
      name: 'Semantic Relevance',
      score: assessment.relevance_score || 0,
      benchmark: 8.0,
      color: '#475569',
    },
    {
      name: 'Overall Score',
      score: assessment.overall_score || 0,
      benchmark: 8.0,
      color: '#059669',
    },
  ];

  const isLastQuestion = questionIndex === records.length - 1;

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Header and Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={onBackToWorkspace}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Interview Workspace
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase">Assessment Report</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-300 font-mono font-medium">
              Q{questionIndex + 1} of {records.length}
            </span>
            {isSpokenMode && (
              <span className="text-xs px-2.5 py-0.5 rounded-none bg-slate-100 text-slate-800 border border-slate-300 font-mono flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Spoken
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{question.question}</p>
        </div>

        {/* Question Selector - Square */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateQuestion(Math.max(0, questionIndex - 1))}
            disabled={questionIndex === 0}
            className="px-3 py-1.5 rounded-none bg-white border border-slate-300 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Prev Q
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {questionIndex + 1}/{records.length}
          </span>
          <button
            onClick={() => onNavigateQuestion(Math.min(records.length - 1, questionIndex + 1))}
            disabled={isLastQuestion}
            className="px-3 py-1.5 rounded-none bg-white border border-slate-300 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Next Q
          </button>
        </div>
      </div>

      {/* Model & Method Attribution Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-none p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Cpu className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-slate-900 font-bold flex items-center gap-2">
              <span className="uppercase font-mono">Text Baseline Engine:</span>
              <span className="font-mono text-slate-700">{assessment.model_name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-white text-slate-600 border border-slate-300 font-mono">Dense Bi-Encoder</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Pipeline: Sentence-BERT cosine similarity against benchmark answer + sentence-level rubric criterion grounding.
              {isSpokenMode && ' Speech transcribed with local Whisper Tiny; prosody features extracted via VAD.'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-mono px-2 py-1 rounded-none bg-white text-slate-700 border border-slate-300">
            Method: {assessment.assessment_method}
          </span>
        </div>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreGauge
          title="Overall Assessment"
          score={assessment.overall_score}
          type="aggregate"
          typeLabel="Weighted Rule"
          accentColor="emerald"
          description="Transparent rule: 55% Rubric Content Quality + 45% Reference Answer Semantic Relevance."
        />

        <ScoreGauge
          title="Content Quality"
          score={assessment.content_score}
          type="heuristic_rubric"
          typeLabel="Rubric Coverage"
          accentColor="indigo"
          description="Calculated from structured weighted rubric criteria verified via semantic matching."
        />

        <ScoreGauge
          title="Answer Relevance"
          score={assessment.relevance_score}
          type="ml_model"
          typeLabel="Sentence-BERT Cosine"
          accentColor="indigo"
          description="Sentence-BERT embedding cosine similarity against canonical benchmark answer."
        />

        <ScoreGauge
          title="Learned Delivery Score"
          score={null}
          type="unimplemented"
          typeLabel={isSpokenMode ? 'Descriptive Metrics Active' : 'Planned Modality'}
          accentColor="slate"
          description={
            isSpokenMode
              ? 'Acoustic metrics (WPM, pauses, fillers) reported descriptively below. Learned delivery score requires training wav2vec 2.0 regression on human ratings.'
              : 'Requires acoustic prosody (Whisper transcription & wav2vec 2.0 speech features). Text alone cannot measure delivery.'
          }
        />
      </div>

      {/* Visual Chart Comparison */}
      <div className="bg-white border border-slate-200 rounded-none p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-slate-700" />
              Measured Performance vs Reference Benchmark
            </h3>
            <p className="text-xs text-slate-500">
              Normalized scores on standard 0–10 academic grading scale
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">Benchmark Target: 8.0</span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0px',
                  fontSize: '12px',
                  color: '#0f172a',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="score" radius={[0, 0, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speech Assessment Section */}
      {isSpokenMode && audioAnalysis && (
        <AudioAnalysisCard
          analysis={audioAnalysis}
          transcript={record.answer || ''}
          isEdited={record.isEditedTranscript}
          originalTranscript={record.originalTranscript || ''}
        />
      )}

      {/* Rubric Breakdown Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              Structured Rubric Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Verification of specific technical concepts, definitions, and reasoning criteria
            </p>
          </div>
          <span className="text-xs text-slate-600 font-mono font-medium">
            {assessment.rubric_breakdown.filter((r: any) => r.matched).length} of{' '}
            {assessment.rubric_breakdown.length} Criteria Met
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assessment.rubric_breakdown.map((criterion: any) => (
            <RubricCard key={criterion.criterion_id} criterion={criterion} />
          ))}
        </div>
      </div>

      {/* Strengths and Weaknesses - White cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-3 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Demonstrated Strengths
          </h4>
          <ul className="space-y-2 text-xs text-slate-700">
            {assessment.strengths.map((s: any, i: number) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-none bg-emerald-600 shrink-0 mt-1.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-3 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Areas for Improvement
          </h4>
          <ul className="space-y-2 text-xs text-slate-700">
            {assessment.weaknesses.map((w: any, i: number) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-none bg-amber-600 shrink-0 mt-1.5" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Feedback & Next Steps */}
      <div className="bg-slate-50 border border-slate-200 rounded-none p-5 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-slate-700" />
          Traceable Recommendations & Suggested Focus
        </h4>
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          {assessment.feedback.map((f: any, i: number) => (
            <p key={i} className="p-3 rounded-none bg-white border border-slate-200">
              {f}
            </p>
          ))}
        </div>
      </div>

      {/* Navigation Footer - Square buttons */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200">
        <button
          onClick={onBackToWorkspace}
          className="px-5 py-2.5 rounded-none border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Workspace
        </button>

        {!isLastQuestion ? (
          <button
            onClick={() => onNavigateQuestion(questionIndex + 1)}
            className="px-6 py-2.5 rounded-none bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors"
          >
            <span>Proceed to Next Question</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onBackToWorkspace}
            className="px-6 py-2.5 rounded-none bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors"
          >
            <span>Complete Review</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
