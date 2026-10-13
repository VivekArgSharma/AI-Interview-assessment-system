import React from 'react';
import { CheckSquare, Square, FileSearch } from 'lucide-react';
import { RubricCriterionResult } from '../types';

interface RubricCardProps {
  criterion: RubricCriterionResult;
}

export const RubricCard: React.FC<RubricCardProps> = ({ criterion }) => {
  return (
    <div
      className={`rounded-none border p-4 transition-colors bg-white ${
        criterion.matched
          ? 'border-emerald-300 shadow-xs'
          : 'border-slate-200 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {criterion.matched ? (
              <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {criterion.title}
            </h5>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {criterion.description}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`inline-block text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-none border ${
              criterion.matched
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            {criterion.matched ? 'Criteria Met' : 'Missing'}
          </span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Conf: {(criterion.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {criterion.evidence && (
        <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-none border border-slate-200 flex items-start gap-2">
          <FileSearch className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-slate-700 leading-snug">
            <span className="text-slate-900 font-semibold uppercase text-[10px] font-mono mr-1">Extracted Evidence:</span>
            <span className="font-mono text-[11px]">"{criterion.evidence}"</span>
          </div>
        </div>
      )}
    </div>
  );
};
