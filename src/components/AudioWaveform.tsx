import React from 'react';

interface Props {
  isActive: boolean;
  color?: 'green' | 'red' | 'blue' | 'amber';
  barCount?: number;
  label?: string;
}

export const AudioWaveform: React.FC<Props> = ({
  isActive,
  color = 'green',
  barCount = 16,
  label,
}) => {
  const colorClasses = {
    green: 'bg-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.6)]',
    red: 'bg-[#FF3131] shadow-[0_0_8px_rgba(255,49,49,0.6)]',
    blue: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]',
    amber: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  };

  const heights = [
    'h-2', 'h-4', 'h-6', 'h-3', 'h-7', 'h-5', 'h-8', 'h-4',
    'h-6', 'h-7', 'h-3', 'h-5', 'h-8', 'h-6', 'h-4', 'h-2',
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 h-8 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
        {Array.from({ length: barCount }).map((_, i) => {
          const heightClass = isActive ? heights[i % heights.length] : 'h-1.5';
          const animDelay = `${(i % 5) * 0.12}s`;
          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                isActive ? `${colorClasses[color]} animate-pulse` : 'bg-neutral-700'
              } ${heightClass}`}
              style={{ animationDelay: animDelay }}
            />
          );
        })}
      </div>
      {label && (
        <span className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? 'text-white' : 'text-neutral-500'}`}>
          {label}
        </span>
      )}
    </div>
  );
};
