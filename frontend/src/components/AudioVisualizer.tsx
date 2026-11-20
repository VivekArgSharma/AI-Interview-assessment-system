import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  isActive: boolean;
  isAiSpeaking?: boolean;
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber';
  height?: number;
  label?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isActive,
  isAiSpeaking = false,
  accentColor = 'indigo',
  height = 48,
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const colorMap = {
    indigo: { bar: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
    emerald: { bar: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    rose: { bar: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
    amber: { bar: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  };

  const theme = colorMap[accentColor] || colorMap.indigo;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let analyser: AnalyserNode | null = null;

    if (stream && isActive) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtxClass();
        audioCtxRef.current = audioCtx;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err) {
        console.warn('AudioVisualizer analyser initialization error:', err);
      }
    }

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (!isActive && !isAiSpeaking) {
        // Flat resting line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();
        return;
      }

      const barCount = 28;
      const gap = 3;
      const barWidth = Math.max(2, (width - (barCount - 1) * gap) / barCount);

      if (analyser && isActive) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * dataArray.length);
          const rawVal = dataArray[index] || 0;
          const normalized = rawVal / 255;
          const barH = Math.max(3, normalized * (h * 0.85));
          const x = i * (barWidth + gap);
          const y = (h - barH) / 2;

          ctx.fillStyle = theme.bar;
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        }
      } else if (isAiSpeaking) {
        // AI Speaking Wave Animation
        phase += 0.08;
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(phase + i * 0.35) * 0.5 + 0.5;
          const barH = Math.max(4, wave * (h * 0.75));
          const x = i * (barWidth + gap);
          const y = (h - barH) / 2;

          ctx.fillStyle = theme.bar;
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
    };
  }, [stream, isActive, isAiSpeaking, accentColor]);

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="w-full bg-slate-900/5 rounded-xl border border-slate-200/80 px-3 py-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={height}
          className="w-full max-w-[280px] block"
        />
      </div>
      {label && (
        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
};
