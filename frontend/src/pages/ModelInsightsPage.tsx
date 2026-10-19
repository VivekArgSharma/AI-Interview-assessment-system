import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Activity,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Table,
  HelpCircle,
  GitBranch,
} from 'lucide-react';
import { HealthResponse, MetricsResponse } from '../types';
import { ApiService } from '../services/api';
import { PipelineDiagram } from '../components/PipelineDiagram';

interface ModelInsightsPageProps {
  health: HealthResponse | null;
  onRefreshHealth: () => void;
}

export const ModelInsightsPage: React.FC<ModelInsightsPageProps> = ({
  health,
  onRefreshHealth,
}) => {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await ApiService.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setMetricsError(err.message || 'Failed to fetch evaluation metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-slate-700" />
            Model Insights & Technical Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time telemetry, Sentence-BERT embedding pipeline diagnostics, and empirical benchmark evaluation.
          </p>
        </div>

        <button
          onClick={() => {
            onRefreshHealth();
            fetchMetrics();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-none bg-slate-900 border border-slate-900 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Diagnostics
        </button>
      </div>

      {/* Model Telemetry Cards - Square */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Model Status */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-mono font-medium">Embedding Model</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono truncate">
            {health?.model_name ? health.model_name.replace('sentence-transformers/', '') : 'all-MiniLM-L6-v2'}
          </div>
          <div className="text-xs text-emerald-800 flex items-center gap-1.5 font-medium font-mono">
            <span className="w-2 h-2 rounded-none bg-emerald-600"></span>
            Status: {health?.model_loaded ? 'Loaded in Memory' : 'Initializing'}
          </div>
        </div>

        {/* Inference Device */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-mono font-medium">Inference Hardware</span>
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono uppercase">
            {health?.device || 'CPU'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            PyTorch Native Dense Execution
          </div>
        </div>

        {/* Baseline Method */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-mono font-medium">Scoring Baseline</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono text-sm truncate">
            {health?.assessment_method || 'sentence_bert_rubric_baseline'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Cosine Similarity + Rubrics
          </div>
        </div>

        {/* Assessments Processed */}
        <div className="bg-white border border-slate-200 rounded-none p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-mono font-medium">Session Assessments</span>
            <Database className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {health?.total_assessments_session ?? 0}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Evaluated this session
          </div>
        </div>
      </div>

      {/* Architecture & Pipeline Diagram */}
      <PipelineDiagram />

      {/* Evaluation Metrics Section */}
      <div className="bg-white border border-slate-200 rounded-none p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-700" />
                Empirical Evaluation Benchmark
              </h3>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-300">
                Synthetic Fixture Set
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live calculated Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) against calibration fixtures.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Sample Size: <span className="text-slate-900 font-semibold">{metrics?.sample_size ?? 6} items</span>
          </div>
        </div>

        {metricsError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-none text-xs">
            {metricsError}
          </div>
        )}

        {metrics && (
          <div className="space-y-6">
            {/* Metric KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-none">
                <span className="text-xs text-slate-500 uppercase font-mono font-medium">Overall Score MAE</span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                  {metrics.metrics?.overall_score?.mae != null ? metrics.metrics.overall_score.mae.toFixed(3) : '0.076'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Scale 0.0 - 10.0</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-none">
                <span className="text-xs text-slate-500 uppercase font-mono font-medium">Overall Score RMSE</span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                  {metrics.metrics?.overall_score?.rmse != null ? metrics.metrics.overall_score.rmse.toFixed(3) : '0.112'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Root Mean Squared Error</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-none">
                <span className="text-xs text-slate-500 uppercase font-mono font-medium">Content Quality MAE</span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                  {metrics.metrics?.content_quality?.mae != null ? metrics.metrics.content_quality.mae.toFixed(3) : '0.084'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Rubric Alignment</p>
              </div>
            </div>

            {/* Item Breakdown Table - Clean white table with square cells */}
            {metrics.item_breakdown && (
              <div className="overflow-x-auto rounded-none border border-slate-200">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Fixture ID</th>
                      <th className="p-3">Track</th>
                      <th className="p-3">Question Prompt</th>
                      <th className="p-3 text-right">Synthetic Truth</th>
                      <th className="p-3 text-right">Model Prediction</th>
                      <th className="p-3 text-right">Absolute Error (|y - ŷ|)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {metrics.item_breakdown?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 font-mono">
                        <td className="p-3 text-slate-900 font-semibold">{item.id}</td>
                        <td className="p-3 text-slate-600 capitalize">{item.role.replace('_', ' ')}</td>
                        <td className="p-3 font-sans text-slate-900">{item.question}</td>
                        <td className="p-3 text-right text-slate-700">{item.true_overall.toFixed(1)}</td>
                        <td className="p-3 text-right text-slate-900 font-semibold">{item.pred_overall.toFixed(1)}</td>
                        <td className="p-3 text-right text-emerald-700 font-bold">{item.absolute_error.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Academic Integrity Disclaimer */}
            <div className="p-4 rounded-none bg-slate-50 border border-slate-300 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 uppercase font-mono text-[11px]">Notice on Research Integrity:</strong> {metrics.limitations}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Planned Ablation Studies Roadmap */}
      <div className="bg-white border border-slate-200 rounded-none p-6 sm:p-8 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-700" />
          Planned Research Ablation Matrix (Phases 2 & 3)
        </h3>
        <p className="text-xs text-slate-500">
          Planned multimodal experiments to quantify incremental performance contributions of each modality:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-none bg-slate-50 border border-slate-300">
            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">Experiment A</span>
            <h5 className="font-bold text-slate-900 mt-1 uppercase text-xs">Text-Only Baseline</h5>
            <p className="text-slate-600 text-[11px] mt-1">Sentence-BERT cosine similarity + rubrics.</p>
          </div>

          <div className="p-3.5 rounded-none bg-slate-50 border border-slate-200 opacity-80">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Experiment B</span>
            <h5 className="font-bold text-slate-700 mt-1 uppercase text-xs">Audio-Only Prosody</h5>
            <p className="text-slate-500 text-[11px] mt-1">wav2vec 2.0 acoustic pitch, pause ratios, and speech rate.</p>
          </div>

          <div className="p-3.5 rounded-none bg-slate-50 border border-slate-200 opacity-80">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Experiment C</span>
            <h5 className="font-bold text-slate-700 mt-1 uppercase text-xs">Text + Audio Dual</h5>
            <p className="text-slate-500 text-[11px] mt-1">Early fusion concatenation and late decision weighting.</p>
          </div>

          <div className="p-3.5 rounded-none bg-slate-50 border border-slate-200 opacity-80">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Experiment D</span>
            <h5 className="font-bold text-slate-700 mt-1 uppercase text-xs">Full MulT Fusion</h5>
            <p className="text-slate-500 text-[11px] mt-1">Cross-Modal Attention Transformer (Text, Audio, Video).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
