"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationCard } from "@/components/simulation/SimulationCard";
import { SimulationProgress } from "@/components/simulation/SimulationProgress";
import type { Scenario, SimulationState } from "@/types";
import { useApp } from "@/context/AppContext";
import { CardSkeleton } from "@/components/ui/LoadingState";

export default function SimulationPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSim, setLocalSim] = useState<SimulationState>({
    running: false,
    stage: 0,
    message: "",
    eventsGenerated: 0,
    candidates: 0,
    incidents: 0,
  });
  const { addToast } = useApp();

  useEffect(() => {
    const controller = new AbortController();

    async function loadScenarios() {
      const response = await fetch("/api/simulation", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load scenarios: ${response.status}`);
      }
      const payload = await response.json();
      setScenarios(Array.isArray(payload.data) ? payload.data : []);
      setLoading(false);
    }

    loadScenarios().catch((error: unknown) => {
      if ((error as { name?: string }).name === "AbortError") return;
      console.error("Failed to load simulation scenarios:", error);
      setScenarios([]);
      setLoading(false);
    });

    return () => controller.abort();
  }, []);

  const handleRun = async (scenarioId: string) => {
    setLocalSim({
      running: true,
      stage: 1,
      message: "Generating events...",
      eventsGenerated: 0,
      candidates: 0,
      incidents: 0,
    });

    await new Promise((r) => setTimeout(r, 800));
    setLocalSim((s) => ({
      ...s,
      stage: 2,
      message: "Events received...",
      eventsGenerated: 20,
    }));

    await new Promise((r) => setTimeout(r, 700));
    setLocalSim((s) => ({
      ...s,
      stage: 3,
      message: "Correlating signals...",
      eventsGenerated: 35,
    }));

    try {
      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Simulation failed with status ${response.status}`);
      }
      const result = payload.data;

      await new Promise((r) => setTimeout(r, 600));
      setLocalSim({
        running: true,
        stage: 4,
        message: `${result.candidates} incident candidates detected`,
        eventsGenerated: result.eventsGenerated,
        candidates: result.candidates,
        incidents: 0,
      });

      await new Promise((r) => setTimeout(r, 700));
      setLocalSim({
        running: false,
        stage: 5,
        message:
          result.incidentsIdentified > 0
            ? `${result.incidentsIdentified} meaningful incidents identified`
            : "No coherent incidents formed from noise",
        eventsGenerated: result.eventsGenerated,
        candidates: result.candidates,
        incidents: result.incidentsIdentified,
      });

      addToast(
        result.incidentsIdentified > 0
          ? `Scenario complete - ${result.incidentsIdentified} incident created from ${result.eventsGenerated} generated events`
          : `Noise generation complete - ${result.eventsGenerated} events generated with no incidents correlated`,
        "success"
      );
    } catch (error: any) {
      console.error("Simulation run failed:", error);
      setLocalSim({
        running: false,
        stage: 0,
        message: "Simulation failed",
        eventsGenerated: 0,
        candidates: 0,
        incidents: 0,
      });
      addToast(error.message || "Simulation failed", "error");
    }
  };

  return (
    <AppShell title="Production Simulation">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">
            Production Simulation
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Generate realistic operational events and watch Incident Radar
            correlate them into incidents.
          </p>
        </div>

        {(localSim.running || localSim.stage > 0) && (
          <SimulationProgress state={localSim} />
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {scenarios.map((s) => (
              <SimulationCard
                key={s.id}
                scenario={s}
                onRun={handleRun}
                running={localSim.running}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
