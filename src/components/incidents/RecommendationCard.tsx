"use client";

import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import type { Recommendation } from "@/types";
import { RotateCcw, Ticket } from "lucide-react";

export function RecommendationCard({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const { addToast } = useApp();
  const primary = recommendations.find((r) => r.primary);
  const secondary = recommendations.filter((r) => !r.primary);

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#121216] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#1f1f24] flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Recommended action
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {primary && (
          <div>
            <p className="text-[14px] font-medium text-zinc-100">
              {primary.title}
            </p>
            {primary.description && (
              <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed">
                {primary.description}
              </p>
            )}
          </div>
        )}

        {secondary.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
              Also consider
            </p>
            <ul className="space-y-1.5">
              {secondary.map((r) => (
                <li
                  key={r.id}
                  className="text-[13px] text-zinc-400 flex items-start gap-2"
                >
                  <span className="text-zinc-700 mt-0.5 select-none">—</span>
                  {r.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              addToast(
                "Rollback request queued — backend integration coming soon.",
                "warning"
              )
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Rollback deployment
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              addToast(
                "Incident ticket creation queued — backend integration coming soon.",
                "info"
              )
            }
          >
            <Ticket className="h-3.5 w-3.5" />
            Create incident ticket
          </Button>
        </div>
      </div>
    </div>
  );
}
