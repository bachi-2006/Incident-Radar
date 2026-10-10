"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationCard } from "@/components/simulation/SimulationCard";
import { SimulationProgress } from "@/components/simulation/SimulationProgress";
import type { Scenario, SimulationState } from "@/types";
import { useApp } from "@/context/AppContext";
import { CardSkeleton } from "@/components/ui/LoadingState";
import { ShieldAlert, Zap, AlertTriangle, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

export default function SimulationPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [orchestratorTriggering, setOrchestratorTriggering] = useState<string | null>(null);
  const [lastTriggerResult, setLastTriggerResult] = useState<{ scenario: string; run_id: string; message: string } | null>(null);

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

  const handleTriggerWorkato = async (scenario: "act" | "ask" | "notify") => {
    setOrchestratorTriggering(scenario);
    try {
      const res = await fetch("/api/orchestrator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to trigger Workato");
      }
      setLastTriggerResult({
        scenario: scenario.toUpperCase(),
        run_id: data.run_id,
        message: data.message,
      });
      addToast(data.message, "success");
    } catch (err: any) {
      console.error("Failed to trigger Workato orchestrator:", err);
      addToast(err.message || "Failed to trigger Workato", "error");
    } finally {
      setOrchestratorTriggering(null);
    }
  };

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
      <div className="space-y-8 max-w-5xl">
        {/* Workato Agentic Orchestrator Control Panel */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-purple-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
                <Zap className="w-3.5 h-3.5" /> Workato Agentic Platform (Track 1)
              </div>
              <h2 className="text-xl font-bold text-zinc-50 tracking-tight">
                Live Workato Autonomous Recovery Hub
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Toggle between production incident scenarios to observe real-time AI triage, policy branching, and verified recovery alerts in Slack.
              </p>
            </div>
            
            <a
              href="https://incidentradar.slack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Open Slack #all-incident-radar <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Scenario 1: ACT */}
            <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-lg p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    BRANCH: ACT
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  1. Autonomous Remediation
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Bad deploy v2.4.1 (42.5% error spike). Genie diagnoses code defect; policy triggers automated rollback &amp; verifies 3 telemetry samples.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => handleTriggerWorkato("act")}
                  disabled={orchestratorTriggering !== null}
                  className="w-full py-2 px-3 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {orchestratorTriggering === "act" ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Orchestrating...
                    </>
                  ) : (
                    "Trigger Auto-Fix (ACT)"
                  )}
                </button>
              </div>
            </div>

            {/* Scenario 2: ASK */}
            <div className="bg-zinc-900/80 border border-amber-500/30 rounded-lg p-4 flex flex-col justify-between hover:border-amber-500/50 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    BRANCH: ASK
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  2. Human-in-the-Loop Approval
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Cluster memory exhaustion over 48h (no recent deploy). Genie flags uncertainty; policy pauses auto-fix and posts approval card to Slack.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => handleTriggerWorkato("ask")}
                  disabled={orchestratorTriggering !== null}
                  className="w-full py-2 px-3 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {orchestratorTriggering === "ask" ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Orchestrating...
                    </>
                  ) : (
                    "Trigger Approval (ASK)"
                  )}
                </button>
              </div>
            </div>

            {/* Scenario 3: NOTIFY */}
            <div className="bg-zinc-900/80 border border-rose-500/30 rounded-lg p-4 flex flex-col justify-between hover:border-rose-500/50 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    BRANCH: NOTIFY
                  </span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  3. Safety Guardrail &amp; Escalation
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Contradictory metrics (CPU 99% vs nominal IO). Genie flags conflicting signals; policy blocks mutations and pages on-call engineer.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => handleTriggerWorkato("notify")}
                  disabled={orchestratorTriggering !== null}
                  className="w-full py-2 px-3 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {orchestratorTriggering === "notify" ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Orchestrating...
                    </>
                  ) : (
                    "Trigger Escalation (NOTIFY)"
                  )}
                </button>
              </div>
            </div>
          </div>

          {lastTriggerResult && (
            <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-purple-400">[{lastTriggerResult.scenario} TRIGGERED]:</span>{" "}
                {lastTriggerResult.message}
              </div>
              <span className="font-mono text-[11px] text-zinc-500">{lastTriggerResult.run_id}</span>
            </div>
          )}
        </div>

        {/* Existing Event Correlation Simulation */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">
            Event Stream Simulation
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Generate synthetic operational event streams and test the local correlation engine.
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
