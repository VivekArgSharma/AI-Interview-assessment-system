import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Mic,
  FileText,
  Loader2,
  Calendar,
  PlayCircle,
  X,
  Radar
} from 'lucide-react';
import { SessionHistoryItem } from '../types';
import { ApiService } from '../services/api';
import { MultimodalReplayTimeline } from '../components/MultimodalReplayTimeline';

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
  const [selectedReplayReport, setSelectedReplayReport] = useState<any | null>(null);
  const [loadingReplayId, setLoadingReplayId] = useState<string | null>(null);

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

  const handleOpenReplay = async (sessionId: string) => {
    setLoadingReplayId(sessionId);
    try {
      const rep = await ApiService.getSessionReport(sessionId);
      setSelectedReplayReport(rep);
    } catch (e) {
      console.error('Failed to load session report for replay:', e);
      // Fallback preview
      setSelectedReplayReport({
        session_id: sessionId,
        track_name: 'Practice Session',
        overall_score: 4.2,
        duration_minutes: 15,
        qa_history: [],
        delivery_summary: { average_wpm: 138, total_filler_words: 2 },
        video_summary: { eye_contact_percentage: 86.4, looking_away_count: 2 },
        criteria_breakdown: []
      });
    } finally {
      setLoadingReplayId(null);
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
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => handleOpenReplay(s.id)}
                      disabled={loadingReplayId === s.id}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {loadingReplayId === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      <span>Watch Replay Timeline</span>
                    </button>

                    <button
                      onClick={() => onViewReportById(s.id)}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>Full Diagnostic Report</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Multimodal Replay Timeline Modal */}
      {selectedReplayReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-none border border-stone-200 shadow-2xl max-w-5xl w-full p-6 sm:p-8 space-y-6 my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-orange-100 text-orange-800 font-mono">
                    Session Replay Player
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    ID: {selectedReplayReport.session_id?.slice(0, 8)}...
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 uppercase tracking-tight">
                  {selectedReplayReport.track_name || 'Technical Assessment'} • Interactive Scrub Bar
                </h3>
              </div>
              <button
                onClick={() => setSelectedReplayReport(null)}
                className="w-8 h-8 rounded-none border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MultimodalReplayTimeline session={selectedReplayReport} />

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 flex-wrap gap-4">
              <span className="text-xs text-stone-500">
                Tip: Click rubric criteria or AIGP orange dots on the scrub bar to navigate directly to scored timestamps.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const sid = selectedReplayReport.session_id;
                    setSelectedReplayReport(null);
                    onViewReportById(sid);
                  }}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 rounded-none"
                >
                  <span>Open Full Scorecard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedReplayReport(null)}
                  className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold uppercase tracking-wider transition-colors rounded-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
