import {
  Rocket,
  Database,
  Activity,
  AlertTriangle,
  CreditCard,
  Circle,
} from "lucide-react";
import type { TimelineItem } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  rocket: Rocket,
  database: Database,
  activity: Activity,
  alert: AlertTriangle,
  "credit-card": CreditCard,
};

export function IncidentTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      {items.map((item, idx) => {
        const Icon = iconMap[item.icon] || Circle;
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="relative flex gap-4 pb-7 last:pb-0">
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-zinc-700 to-zinc-800" />
            )}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-[#0c0c0e] text-zinc-400">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="pt-1.5 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-[11px] font-mono text-zinc-500 tabular">
                  {item.time}
                </span>
                <span className="text-[13px] font-medium text-zinc-100">
                  {item.title}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-zinc-500 font-mono">
                {item.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
