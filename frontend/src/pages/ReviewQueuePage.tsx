import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Sliders,
  FileCheck,
  Loader2
} from 'lucide-react';
import { ApiService } from '../services/api';
import { ReviewQueueItemData } from '../types';

interface ReviewQueuePageProps {
  onRefreshCount?: (count: number) => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onRefreshCount }) => {
  const [queue, setQueue] = useState<ReviewQueueItemData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState<ReviewQueueItemData | null>(null);

  // Resolution form state
  const [selectedDimension, setSelectedDimension] = useState<string>('Trade-Off Awareness');
  const [adjustedScore, setAdjustedScore] = useState<number>(4.0);
  const [resolutionRationale, setResolutionRationale] = useState<string>(
    'Candidate explicitly addressed in-memory vs distributed cache trade-offs in follow-up inquiry.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getReviewQueue();
      setQueue(data);
      if (onRefreshCount) onRefreshCount(data.length);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReview = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      const contestId = activeItem.pending_contests?.[0]?.id;
      await ApiService.resolveReview(activeItem.session_id, {
        dimension: selectedDimension,
        adjusted_score: adjustedScore,
        resolution_note: resolutionRationale,
        contest_id: contestId,
        contest_status: 'resolved'
      });
      alert(`Score on ${selectedDimension} successfully adjusted to ${adjustedScore} / 5.0 and resolved.`);
      setActiveItem(null);
      await loadQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Human Reviewer Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
              {queue.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sessions routed here when multimodal prediction confidence intervals are wide (D3) or when a candidate contests a timestamped score (D9).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">Loading review queue...</div>
      ) : queue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Review Queue is Empty</h3>
          <p className="text-xs text-slate-500 mt-1">
            All multimodal candidate assessments have satisfied high-confidence calibration thresholds.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">Candidate</th>
                  <th className="py-3.5 px-4 font-semibold">Role & Scenario</th>
                  <th className="py-3.5 px-4 font-semibold">Model Score & CI</th>
                  <th className="py-3.5 px-4 font-semibold">Flag Reason</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {queue.map((item) => (
                  <tr key={item.session_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.candidate_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{item.role_title}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{item.scenario_type}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {item.overall_score} <span className="text-slate-400 text-[11px]">{item.overall_ci}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.is_contested ? (
                        <span className="text-amber-800 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Contested by Candidate
                        </span>
                      ) : (
                        <span className="text-slate-600">{item.review_reason || 'Low Prediction Confidence'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Awaiting Review
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveItem(item);
                          if (item.pending_contests?.[0]?.dimension) {
                            setSelectedDimension(item.pending_contests[0].dimension);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
                      >
                        Inspect & Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Review Resolution Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Resolve Score & Calibration Review</h3>
                <p className="text-xs text-slate-500">Candidate: {activeItem.candidate_name} • {activeItem.role_title}</p>
              </div>
              <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Candidate Contest Reason if any */}
            {activeItem.is_contested && activeItem.pending_contests?.[0] && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-xs text-amber-900 space-y-1">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block">
                  Candidate Contest Statement (Flagged at timestamp 00:{Math.round(activeItem.pending_contests[0].timestamp_seconds)})
                </span>
                <p className="italic">"{activeItem.pending_contests[0].reason}"</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Target Rubric Dimension</label>
                <input
                  type="text"
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
                />
              </div>

              {/* Side-by-Side Model Score vs Adjusted Reviewer Score */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Model Score</span>
                  <div className="text-2xl font-extrabold text-slate-700 font-mono">
                    3.2 <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">CI: [2.50 - 3.85] (Wide)</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block mb-1">Reviewer Adjusted Score</span>
                  <div className="text-2xl font-extrabold text-indigo-700 font-mono">
                    {adjustedScore} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={adjustedScore}
                    onChange={(e) => setAdjustedScore(Number(e.target.value))}
                    className="w-full accent-indigo-600 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Reviewer Resolution Rationale</label>
                <textarea
                  value={resolutionRationale}
                  onChange={(e) => setResolutionRationale(e.target.value)}
                  rows={3}
                  className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Explain why the score was adjusted and how evidence clips or candidate follow-up supported this resolution..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveReview}
                disabled={isSubmitting || !resolutionRationale.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                <span>Finalize Resolution</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
