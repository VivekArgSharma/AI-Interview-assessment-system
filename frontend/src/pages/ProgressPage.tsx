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
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
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
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs uppercase font-mono tracking-wider">Loading Performance Trends & Analytics...</p>
      </div>
    );
  }

  const chartData = overview?.score_trend || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800">
              PRD Section 5.13
            </span>
            <span className="text-xs text-slate-400">Longitudinal Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interview Progress & Growth Tracker</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your performance improvement, rubric mastery, and recurring skill gaps across practice attempts.
          </p>
        </div>

        <button
          onClick={onStartNewPractice}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Practice Session</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Content Score</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {overview?.average_content_score || 0}%
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed Sessions</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {overview?.completed_sessions || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Practice Time</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {overview?.total_practice_minutes || 0} mins
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Goals</span>
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {recommendations.length}
          </div>
        </div>
      </div>

      {/* Performance Score Trend Chart */}
      <div className="bg-slate-900 border border-slate-700 p-6 mb-8 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Score Progression Over Time
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluated content scores across comparable practice sessions
            </p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700">
            Last {chartData.length} Sessions
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 0,
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Content Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#06b6d4', strokeWidth: 1, stroke: '#0891b2' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
            Complete at least one practice interview to generate score progression trends.
          </div>
        )}
      </div>

      {/* Criteria Mastery & Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Rubric Criteria Mastery */}
        <div className="bg-slate-900 border border-slate-700 p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Rubric Criteria Mastery
            </h3>
            <span className="text-[10px] text-slate-400">Lowest mastery on top</span>
          </div>

          {criteria.length > 0 ? (
            <div className="space-y-4">
              {criteria.map((crit) => (
                <div key={crit.criterion_key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{crit.criterion_name}</span>
                    <span className="font-mono text-slate-300">
                      {crit.average_score.toFixed(1)} / {crit.maximum_score} ({crit.mastery_percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        crit.mastery_percentage >= 75
                          ? 'bg-emerald-500'
                          : crit.mastery_percentage >= 50
                          ? 'bg-cyan-500'
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
            <div className="p-8 text-center text-xs text-slate-500 italic">
              Criteria statistics will populate as you complete interview exercises.
            </div>
          )}
        </div>

        {/* Tailored Practice Recommendations */}
        <div className="bg-slate-900 border border-slate-700 p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Recommended Practice Drills
            </h3>
            <span className="text-[10px] text-amber-400 font-mono font-bold">Priority Focus</span>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-850 border border-slate-750 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Focus Drill ({rec.priority} priority)
                    </span>
                    <p className="text-slate-200 leading-relaxed">{rec.recommendation_text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              Complete an interview session to receive customized practice recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Session History Table */}
      <div className="bg-slate-900 border border-slate-700 p-6 shadow-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
          Historical Practice Sessions
        </h3>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-750">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Track</th>
                  <th className="py-2.5 px-3">Difficulty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Content Score</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{s.track_name}</td>
                    <td className="py-3 px-3 capitalize text-slate-300">{s.difficulty}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 ${
                          s.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {s.content_score != null ? `${s.content_score}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.status === 'completed' && (
                        <button
                          onClick={() => onViewReportById(s.id)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] uppercase tracking-wider"
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
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No previous sessions found. Start a practice interview to begin recording history.
          </div>
        )}
      </div>
    </div>
  );
};
