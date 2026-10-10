import type { Evidence } from "@/types";

export function EvidenceCard({
  evidence,
  step,
}: {
  evidence: Evidence;
  step?: number;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#27272a] bg-[#121216] p-3.5 hover:border-zinc-700/80 transition-colors">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400 tabular">
        {step ?? "✓"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-100 leading-snug">
          {evidence.title}
        </p>
        <p className="text-[12px] text-zinc-400 mt-0.5 font-mono tabular">
          {evidence.detail}
        </p>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-600">
          <span className="text-zinc-500">{evidence.source}</span>
          <span className="text-zinc-800">·</span>
          <span className="font-mono">{evidence.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
