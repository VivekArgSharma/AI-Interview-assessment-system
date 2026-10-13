import React from 'react';
import { ArrowRight, CheckCircle2, Clock, GitMerge, FileText, Mic, Video, Sparkles, Layers } from 'lucide-react';

export const PipelineDiagram: React.FC = () => {
  const textPipelineSteps = [
    { title: 'Candidate Answer', desc: 'Raw typed response input', status: 'active' },
    { title: 'Text Preprocessing', desc: 'Whitespace normalization & sentence splitting', status: 'active' },
    { title: 'Sentence-BERT', desc: 'all-MiniLM-L6-v2 384-d semantic encoding', status: 'active' },
    { title: 'Cosine Relevance', desc: 'Similarity against reference benchmark', status: 'active' },
    { title: 'Rubric Evaluator', desc: 'Keyword & semantic criterion matching', status: 'active' },
    { title: 'Feedback Report', desc: 'Traceable strengths & weaknesses', status: 'active' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            System Architecture & Pipeline Flow
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase 1 text bi-encoder baseline and Phase 2 Whisper speech analysis architecture.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <span className="w-2 h-2 rounded-none bg-emerald-600"></span> Active (Phase 1 & 2)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-none bg-slate-300"></span> Planned (Phase 3)
          </span>
        </div>
      </div>

      {/* Primary Implemented Text Pipeline */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono uppercase font-semibold">
            Modality 1: Text Bi-Encoder Pipeline (Operational)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {textPipelineSteps.map((step, idx) => (
            <div
              key={idx}
              className="relative bg-slate-50 border border-slate-200 rounded-none p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    STEP 0{idx + 1}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{step.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">{step.desc}</p>
              </div>

              {idx < textPipelineSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Multimodal Planned Extension Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-5 border-t border-slate-200">
        {/* Audio Branch */}
        <div className="bg-slate-50 border border-slate-300 rounded-none p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Audio Modality</h4>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-300">
              Active (Phase 2)
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Local OpenAI Whisper transcription paired with Silero/STE VAD pause metrics, articulation rates, and token-aware filler word parsing.
          </p>
        </div>

        {/* Video Branch */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-none p-4 opacity-80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Video Modality</h4>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-none bg-slate-100 text-slate-500 border border-slate-300">
              Planned Phase 2
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Observable visual metrics: head orientation, gaze stability, and facial presence via MediaPipe. Avoids unsupported emotion inferences.
          </p>
        </div>

        {/* Fusion Model */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-none p-4 opacity-80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Multimodal Fusion</h4>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-none bg-slate-100 text-slate-500 border border-slate-300">
              Planned Phase 3
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cross-modal Attention Transformer (MulT) fusing text embeddings, acoustic features, and visual embeddings trained against human rating datasets.
          </p>
        </div>
      </div>
    </div>
  );
};
