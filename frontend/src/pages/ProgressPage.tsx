import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Loader2,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  ProgressOverviewData,
  CriterionTrendData,
  RecommendationData,
  SessionHistoryItem
} from '../types';
import { ApiService } from '../services/api';

interface ProgressPageProps {
  onStartNewPractice: () => void;
  onViewReportById: (sessionId: string) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  onStartNewPractice,
  onViewReportById,
}) => {
  const [overview, setOverview] = useState<ProgressOverviewData | null>(null);
  const [criteria, setCriteria] = useState<CriterionTrendData[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, criteriaData, recsData, historyData] = await Promise.all([
        ApiService.getProgressOverview().catch(() => null),
        ApiService.getCriteriaTrends().catch(() => []),
        ApiService.getRecommendations().catch(() => []),
        ApiService.getHistory().catch(() => []),
      ]);
      setOverview(overviewData);
      setCriteria(criteriaData);
      setRecommendations(recsData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-24 text-center text-stone-500 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin mb-3" />
        <p className="text-xs uppercase font-mono tracking-wider font-semibold">Loading Performance Trends & Analytics...</p>
      </div>
    );
  }

  const chartData = overview?.score_trend || [];

  return (
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-10 space-y-10 font-sans">
      {/* Page Header */}
      <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-none">
              PRD Section 5.13 • Longitudinal Analytics
            </span>
            <span className="text-xs text-stone-500">Multimodal Progress Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Interview Progress & Growth Tracker
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
            Track your performance improvement, rubric criterion mastery, and longitudinal trends across all interview attempts with calibrated multi-stage evaluations.
          </p>
        </div>

        <button
          onClick={onStartNewPractice}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start lg:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Practice Session</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Average Score</span>
            <div className="w-8 h-8 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-mono">
            {overview?.average_content_score || 0}%
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Calibrated rubric average</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Completed Sessions</span>
            <div className="w-8 h-8 rounded-none bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 font-mono">
            {overview?.completed_sessions || 0}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Verified evaluation runs</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Practice Time</span>
            <div className="w-8 h-8 rounded-none bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-mono">
            {overview?.total_practice_minutes || 0} <span className="text-base font-normal text-stone-500">mins</span>
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Total microphone airtime</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-none p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Active Goals</span>
            <div className="w-8 h-8 rounded-none bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-orange-600 font-mono">
            {recommendations.length}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Priority focus recommendations</span>
        </div>
      </div>

      {/* Performance Score Trend Chart */}
      <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Score Progression Over Time
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Evaluated content & delivery scores across comparable practice sessions
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 bg-stone-100 text-stone-700 border border-stone-200 rounded-none">
            {chartData.length} Session Data Points
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="date" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#78716c" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fed7aa',
                    borderRadius: 0,
                    fontSize: '12px',
                    color: '#1c1917',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                  formatter={(val: any) => [`${val}%`, 'Content Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#ea580c"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#ea580c', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 border border-dashed border-stone-200 rounded-none flex items-center justify-center text-xs text-stone-500 bg-stone-50/50">
            Complete at least one practice interview to generate score progression trends.
          </div>
        )}
      </div>

      {/* Criteria Mastery & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rubric Criteria Mastery */}
        <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Rubric Criteria Mastery
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Average scores across foundational rubrics</p>
            </div>
            <span className="text-[10px] text-stone-500 font-mono uppercase bg-stone-100 px-2 py-0.5 rounded-none">
              Ranked
            </span>
          </div>

          {criteria.length > 0 ? (
            <div className="space-y-5">
              {criteria.map((crit) => (
                <div key={crit.criterion_key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800">{crit.criterion_name}</span>
                    <span className="font-mono text-stone-600 font-bold">
                      {crit.average_score.toFixed(1)} / {crit.maximum_score} ({crit.mastery_percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-none overflow-hidden flex border border-stone-200">
                    <div
                      className={`h-full transition-all ${
                        crit.mastery_percentage >= 75
                          ? 'bg-emerald-500'
                          : crit.mastery_percentage >= 50
                          ? 'bg-orange-500'
                          : crit.mastery_percentage >= 30
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(5, crit.mastery_percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-500 italic bg-stone-50/50 border border-dashed border-stone-200 rounded-none">
              Criteria statistics will populate as you complete interview exercises.
            </div>
          )}
        </div>

        {/* Tailored Practice Recommendations */}
        <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Recommended Practice Drills
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Targeted exercises based on diagnostic deficit analysis</p>
            </div>
            <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 font-mono font-bold px-2 py-0.5 rounded-none">
              Priority Focus
            </span>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-orange-50/40 border border-orange-100 rounded-none text-xs flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-orange-800 block mb-1">
                      Focus Drill ({rec.priority} priority)
                    </span>
                    <p className="text-stone-700 leading-relaxed">{rec.recommendation_text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-500 italic bg-stone-50/50 border border-dashed border-stone-200 rounded-none">
              Complete an interview session to receive customized practice recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Historical Practice Sessions Table - Clean, Spacious, Modern White & Orange */}
      <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
          <div>
            <h3 className="text-base font-bold uppercase tracking-wider text-stone-900">
              Historical Practice Sessions
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Complete historical record of all completed mock simulations</p>
          </div>
          <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-3 py-1 border border-stone-200 rounded-none">
            {history.length} Total Sessions
          </span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-mono border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Track</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Content Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {history.map((s) => (
                  <tr key={s.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">{s.track_name}</td>
                    <td className="py-3.5 px-4 capitalize text-stone-600">{s.difficulty}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-none border ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                      {s.content_score != null ? `${s.content_score}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {s.status === 'completed' && (
                        <button
                          onClick={() => onViewReportById(s.id)}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-600 border border-orange-200 hover:border-orange-600 text-orange-700 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-none transition-all shadow-xs"
                        >
                          View Report →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-stone-500 italic bg-stone-50/50 border border-dashed border-stone-200 rounded-none">
            No previous sessions found. Start a practice interview to begin recording history.
          </div>
        )}
      </div>
    </div>
  );
};
