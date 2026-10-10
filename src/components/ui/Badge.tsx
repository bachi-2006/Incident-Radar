import { cn, severityColor, severityLabel } from "@/lib/utils";
import { Severity } from "@/types";

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
        severityColor(severity),
        className
      )}
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          severity === "critical" && "bg-red-400",
          severity === "high" && "bg-orange-400",
          severity === "medium" && "bg-yellow-400",
          severity === "low" && "bg-emerald-400",
          severity === "info" && "bg-zinc-400"
        )}
      />
      {severityLabel(severity)}
    </span>
  );
}

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "ai" | "status" | "mono";
}) {
  const variants = {
    default: "bg-zinc-800/80 text-zinc-400 border-zinc-700/80",
    ai: "bg-violet-500/10 text-violet-300 border-violet-500/25",
    status: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    mono: "bg-zinc-900 text-zinc-500 border-zinc-800 font-mono",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
