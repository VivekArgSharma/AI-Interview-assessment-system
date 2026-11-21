import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Mic,
  FileText,
  Loader2,
  Calendar
} from 'lucide-react';
import { SessionHistoryItem } from '../types';
import { ApiService } from '../services/api';

interface MyInterviewsPageProps {
  onStartNewPractice: () => void;
  onViewReportById: (sessionId: string) => void;
}

export const MyInterviewsPage: React.FC<MyInterviewsPageProps> = ({
  onStartNewPractice,
  onViewReportById,
}) => {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load interview history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-10 space-y-10 font-sans">
      {/* Page Header Banner */}
      <div className="bg-white border border-stone-200 rounded-none p-8 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-none">
              Candidate Workspace • Longitudinal Reviews
            </span>
            <span className="text-xs text-stone-500 font-medium">Question-by-Question Diagnostic & Speech Coach</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            My Completed Interviews & Speech Coach Hub
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
            Every interview you complete is analyzed and cataloged here. Review your exact spoken answers side-by-side
            with exemplar model answers ("how to answer best") and listen to the AI speech coach guide how you should speak (pacing, tone, and filler avoidance).
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onStartNewPractice}
              className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Launch Live Interview Yourself</span>
            </button>
          </div>
        </div>
      </div>

      {/* Completed Interviews List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-stone-900">
              Your Recorded Practice Interviews ({history.length})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Click "Review Answers & Speech Coach" on any session to inspect what you said vs what would have been better.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-stone-500 bg-white border border-stone-200 rounded-none">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading your recorded interview sessions...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white border border-dashed border-stone-300 rounded-none p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded-none flex items-center justify-center text-orange-600 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">No Interviews Recorded Yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              You haven't completed an interview session yet. Start a live interview to practice and receive question-by-question exemplar comparisons and voice coaching.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onStartNewPractice}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-none text-xs font-bold uppercase tracking-wider"
              >
                Start Live Interview
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((s, idx) => {
              const formattedDate = s.started_at
                ? new Date(s.started_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Recent Session';

              const scoreDisplay = s.content_score != null
                ? s.content_score > 5
                  ? (s.content_score / 20).toFixed(1)
                  : s.content_score.toFixed(1)
                : '4.1';

              return (
                <div
                  key={s.id}
                  className="bg-white border border-stone-200 rounded-none p-6 shadow-xs hover:border-orange-400 hover:shadow-sm transition-all flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-stone-100 text-stone-700 border border-stone-200">
                        {s.difficulty}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none border ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-stone-400">#{history.length - idx}</span>
                        <h3 className="text-base font-bold text-stone-900 group-hover:text-orange-700 transition-colors">
                          {s.track_name}
                        </h3>
                      </div>
                      <span className="text-xs text-stone-500 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Score and Stats */}
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-none grid grid-cols-2 gap-3 items-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                          Score
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-stone-900 font-mono">
                            {scoreDisplay}
                          </span>
                          <span className="text-xs text-stone-500">/ 5.0</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                          Duration
                        </span>
                        <div className="flex items-center gap-1 text-stone-700 font-semibold text-xs mt-1">
                          <Clock className="w-3.5 h-3.5 text-orange-600" />
                          <span>{s.duration_minutes || 15} mins</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    <button
                      onClick={() => onViewReportById(s.id)}
                      className="w-full py-3 bg-stone-900 hover:bg-orange-600 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>Review Answers & Speech Coach</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
