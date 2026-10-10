import { Severity } from "@/types";

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/25";
    case "high":
      return "text-orange-400 bg-orange-500/10 border-orange-500/25";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/25";
    case "low":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    default:
      return "text-zinc-400 bg-zinc-500/10 border-zinc-500/25";
  }
}

export function severityDot(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-emerald-500";
    default:
      return "bg-zinc-500";
  }
}

export function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function healthColor(health: string): string {
  switch (health) {
    case "healthy":
      return "text-emerald-400";
    case "degraded":
      return "text-orange-400";
    case "critical":
      return "text-red-400";
    default:
      return "text-zinc-400";
  }
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
