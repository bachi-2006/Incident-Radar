"use client";

import { Button } from "@/components/ui/Button";
import type { Scenario } from "@/types";
import { Play, Volume2 } from "lucide-react";

export function SimulationCard({
  scenario,
  onRun,
  running,
}: {
  scenario: Scenario;
  onRun: (id: string) => void;
  running: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">
        {scenario.title}
      </h3>
      <p className="text-xs text-zinc-500 mb-3 flex-1">{scenario.description}</p>
      <ul className="space-y-1 mb-4">
        {scenario.steps.map((s, i) => (
          <li key={i} className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="text-zinc-600">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant={scenario.type === "noise" ? "secondary" : "primary"}
        disabled={running}
        onClick={() => onRun(scenario.id)}
        className="w-full"
      >
        {scenario.type === "noise" ? (
          <>
            <Volume2 className="h-3.5 w-3.5" />
            Generate Noise
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Run Scenario
          </>
        )}
      </Button>
    </div>
  );
}
