"use client";

export function ConfidenceScore({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width="84" height="84" className="-rotate-90">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="5"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="url(#confGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-semibold text-zinc-100 tabular leading-none">
          {value}%
        </span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-600 mt-1">
          conf
        </span>
      </div>
    </div>
  );
}
