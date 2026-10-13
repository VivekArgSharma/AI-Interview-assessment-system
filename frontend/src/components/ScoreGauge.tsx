import React from 'react';
import { CheckCircle, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';

interface ScoreGaugeProps {
  title: string;
  score: number | null;
  maxScore?: number;
  type: 'ml_model' | 'heuristic_rubric' | 'unimplemented' | 'aggregate';
  typeLabel: string;
  description: string;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'slate';
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  title,
  score,
  maxScore = 10,
  type,
  typeLabel,
  description,
  accentColor = 'indigo',
}) => {
  const isMeasured = score !== null && type !== 'unimplemented';
  const percentage = isMeasured ? Math.min(100, Math.max(0, (score! / maxScore) * 100)) : 0;

  const colorStyles = {
    indigo: {
      bar: 'bg-slate-900',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      text: 'text-slate-900',
    },
    emerald: {
      bar: 'bg-emerald-600',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      text: 'text-emerald-700',
    },
    amber: {
      bar: 'bg-amber-600',
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      text: 'text-amber-700',
    },
    slate: {
      bar: 'bg-slate-400',
      badge: 'bg-slate-100 text-slate-700 border-slate-300',
      text: 'text-slate-700',
    },
  }[accentColor];

  return (
    <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs hover:border-slate-400 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h4>
          <span
            className={`inline-block text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-none mt-1.5 border ${
              type === 'unimplemented'
                ? 'bg-slate-100 text-slate-500 border-slate-300'
                : colorStyles.badge
            }`}
          >
            {typeLabel}
          </span>
        </div>

        <div className="text-right">
          {isMeasured ? (
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono tracking-tight ${colorStyles.text}`}>
                {score?.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-mono">/{maxScore}</span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-none border border-slate-300">
              Not measured
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar - Square */}
      <div className="w-full bg-slate-100 h-1.5 rounded-none overflow-hidden my-3 border border-slate-200">
        {isMeasured ? (
          <div
            className={`h-full rounded-none transition-all duration-700 ease-out ${colorStyles.bar}`}
            style={{ width: `${percentage}%` }}
          />
        ) : (
          <div className="h-full bg-slate-200 w-full" />
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mt-2">{description}</p>
    </div>
  );
};
