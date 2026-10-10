import type { ReactNode } from "react";
import type { PolicyDecision, Severity, ServiceHealth, IncidentStatus } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function severityClass(severity: Severity) {
  switch (severity) {
    case "critical":
      return "bg-red-500/15 text-red-400 border-red-500/25";
    case "high":
      return "bg-orange-500/15 text-orange-400 border-orange-500/25";
    case "medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
    case "low":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    default:
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";
  }
}

export function statusClass(status: IncidentStatus) {
  switch (status) {
    case "active":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "investigating":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "mitigated":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    default:
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
}

export function policyClass(decision: PolicyDecision) {
  switch (decision) {
    case "ACT":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "ASK":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    default:
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  }
}

export function healthClass(health: ServiceHealth) {
  switch (health) {
    case "healthy":
      return "text-emerald-400";
    case "degraded":
      return "text-amber-400";
    case "critical":
      return "text-red-400";
    default:
      return "text-zinc-400";
  }
}

export function formatTime(iso: string) {
  return iso.slice(11, 19);
}

export function Sparkline({ values, color = "#3b82f6" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 120;
  const h = 36;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[120px]">
      <polyline fill="none" stroke={color} strokeWidth="1.6" points={pts} />
    </svg>
  );
}

export function RadarMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <circle cx="14" cy="14" r="13" stroke="#3b82f6" strokeWidth="1.5" opacity="0.35" />
      <circle cx="14" cy="14" r="8" stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" />
      <circle cx="14" cy="14" r="3" fill="#3b82f6" />
      <path d="M14 1v4M14 23v4M1 14h4M23 14h4" stroke="#3b82f6" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}>
      {children}
    </span>
  );
}
