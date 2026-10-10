"use client";

import type { SimulationState } from "@/types";
import { Loader2 } from "lucide-react";

export function SimulationProgress({ state }: { state: SimulationState }) {
  if (!state.running && state.stage === 0) return null;

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-950/15 px-4 py-3.5">
      <div className="flex items-center gap-3">
        {state.running && (
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-zinc-100">
            {state.message}
          </p>
          <div className="flex flex-wrap gap-4 mt-1.5 text-[11px] text-zinc-500 tabular">
            {state.eventsGenerated > 0 && (
              <span>{state.eventsGenerated} events</span>
            )}
            {state.candidates > 0 && (
              <span>{state.candidates} candidates</span>
            )}
            {state.incidents > 0 && (
              <span className="text-emerald-400/90">
                {state.incidents} incidents identified
              </span>
            )}
          </div>
        </div>
      </div>
      {state.running && (
        <div className="mt-3 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, state.stage * 14)}%` }}
          />
        </div>
      )}
    </div>
  );
}
