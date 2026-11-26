import React from 'react';
import { Target, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface CompetencyDataPoint {
  competency: string;
  targetScore: number; // 1.0 - 5.0
  actualScore: number; // 1.0 - 5.0
  description?: string;
}

export interface CompetencySpiderRadarProps {
  data?: CompetencyDataPoint[];
  targetCompetencies?: any[];
  actualCompetencies?: any[];
  title?: string;
  jobTitle?: string;
}

export const CompetencySpiderRadar: React.FC<CompetencySpiderRadarProps> = ({
  data,
  targetCompetencies,
  actualCompetencies,
  title = 'Competency Match Matrix (JD Target vs. Candidate Demonstrated)',
  jobTitle = 'Staff Backend Distributed Systems Engineer'
}) => {
  // Derive data from targetCompetencies and actualCompetencies if passed
  let resolvedData: CompetencyDataPoint[] = data || [
    { competency: 'Distributed Concurrency', targetScore: 4.5, actualScore: 4.7, description: 'Mutex locks, stampede prevention, thread safety' },
    { competency: 'System Scalability', targetScore: 4.5, actualScore: 4.6, description: 'L1/L2 caching, jittered TTL, throughput' },
    { competency: 'Fault Tolerance', targetScore: 4.2, actualScore: 4.3, description: 'Idempotent state transitions & retries' },
    { competency: 'Algorithmic Rigor', targetScore: 4.0, actualScore: 4.4, description: 'C++ space/time optimization' },
    { competency: 'Communication', targetScore: 4.2, actualScore: 4.0, description: 'Trade-off justification & clarity' }
  ];

  if (targetCompetencies && targetCompetencies.length > 0) {
    resolvedData = targetCompetencies.map((tc: any, idx: number) => {
      const compName = tc.name || tc.competency || `Competency ${idx + 1}`;
      const targetVal = Number(tc.target_score ?? tc.targetScore ?? 4.5);
      const match = actualCompetencies?.find((ac: any) =>
        (ac.name || ac.criterion_name || ac.competency)?.toLowerCase().includes(compName.toLowerCase()) ||
        compName.toLowerCase().includes((ac.name || ac.criterion_name || ac.competency || '').toLowerCase())
      );
      const actualVal = match
        ? Number(match.actual_score ?? match.calibrated_score ?? match.score ?? 4.2)
        : Number((targetVal - 0.3).toFixed(1));

      return {
        competency: compName,
        targetScore: targetVal,
        actualScore: Math.min(5.0, Math.max(1.0, actualVal)),
        description: tc.description || `JD benchmark standard: ${targetVal} / 5.0`
      };
    });
  }

  const size = 320;
  const center = size / 2;
  const radius = center - 50;
  const total = resolvedData.length;

  // Calculate coordinates on the radar for value (1 to 5)
  const getCoordinates = (value: number, index: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (value / 5.0) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Build polygon path strings
  const targetPoints = resolvedData.map((d, i) => {
    const coords = getCoordinates(d.targetScore, i);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const actualPoints = resolvedData.map((d, i) => {
    const coords = getCoordinates(d.actualScore, i);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  // Concentric polygon grid levels (1 to 5)
  const levels = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200">
              Enterprise Feature
            </span>
            <span className="text-xs font-mono text-stone-500">JD-to-Rubric AI Generator</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mt-1">{title}</h3>
          <p className="text-xs text-stone-500 mt-0.5">Target Benchmark: <strong>{jobTitle}</strong></p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-stone-400 border-dashed" />
            <span className="text-stone-500">JD Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-orange-600/60 border border-orange-600" />
            <span className="text-stone-900 font-bold">Candidate Actual</span>
          </div>
        </div>
      </div>

      {/* Spider Radar & Detailed Delta Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* SVG Radar Graphic (5 Cols) */}
        <div className="lg:col-span-5 flex justify-center select-none">
          <svg width={size} height={size} className="overflow-visible">
            {/* Concentric Grid Polygons */}
            {levels.map((lvl) => {
              const polyPoints = resolvedData.map((_, i) => {
                const c = getCoordinates(lvl, i);
                return `${c.x},${c.y}`;
              }).join(' ');
              return (
                <polygon
                  key={lvl}
                  points={polyPoints}
                  fill="none"
                  stroke="#e7e5e4"
                  strokeWidth="1"
                  strokeDasharray={lvl === 5 ? 'none' : '2 2'}
                />
              );
            })}

            {/* Radial Spokes */}
            {resolvedData.map((_, i) => {
              const outer = getCoordinates(5, i);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#e7e5e4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Target JD Benchmark Polygon (Dashed Stone Outline) */}
            <polygon
              points={targetPoints}
              fill="rgba(168, 162, 158, 0.15)"
              stroke="#78716c"
              strokeWidth="2"
              strokeDasharray="4 3"
            />

            {/* Candidate Actual Demonstrated Polygon (Solid Orange Fill) */}
            <polygon
              points={actualPoints}
              fill="rgba(234, 88, 12, 0.35)"
              stroke="#ea580c"
              strokeWidth="2.5"
            />

            {/* Vertices & Axis Labels */}
            {resolvedData.map((d, i) => {
              const actualCoord = getCoordinates(d.actualScore, i);
              const labelCoord = getCoordinates(5.7, i);
              return (
                <g key={i}>
                  {/* Point Marker */}
                  <circle
                    cx={actualCoord.x}
                    cy={actualCoord.y}
                    r="4"
                    fill="#ea580c"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {/* Label */}
                  <text
                    x={labelCoord.x}
                    y={labelCoord.y}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fill="#292524"
                  >
                    {d.competency.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Delta Breakdown & Competency Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2">
            Competency Gap Analysis vs. Job Description
          </h4>

          <div className="space-y-2">
            {resolvedData.map((item, idx) => {
              const delta = +(item.actualScore - item.targetScore).toFixed(1);
              const pctDiff = Math.round((delta / item.targetScore) * 100);
              const isPositive = delta >= 0;

              return (
                <div key={idx} className="p-3 bg-stone-50 border border-stone-200 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-stone-900 block font-sans">{item.competency}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{item.description}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block">TARGET / ACTUAL</span>
                      <span className="font-bold text-stone-900">{item.targetScore} / {item.actualScore}</span>
                    </div>

                    <div className={`px-2 py-1 text-[10px] font-bold flex items-center gap-0.5 border ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{isPositive ? `+${pctDiff}%` : `${pctDiff}%`}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
