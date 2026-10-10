"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { EventVolumeChart } from "@/components/charts/EventVolumeChart";
import { ErrorRateChart } from "@/components/charts/ErrorRateChart";
import { SimulationProgress } from "@/components/simulation/SimulationProgress";
import { Button } from "@/components/ui/Button";
import type { Incident, Event } from "@/types";
import { useApp } from "@/context/AppContext";
import { Play, ArrowRight } from "lucide-react";
import { KPISkeleton } from "@/components/ui/LoadingState";

export default function OverviewPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { runMainSimulation, simulation, eventCount, setEventCount, simulationComplete } =
    useApp();

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      setLoading(true);
      const [incidentsResponse, eventsResponse] = await Promise.all([
        fetch("/api/incidents", { cache: "no-store", signal: controller.signal }),
        fetch("/api/events", { cache: "no-store", signal: controller.signal }),
      ]);

      if (!incidentsResponse.ok || !eventsResponse.ok) {
        throw new Error(
          `Failed to load overview data: incidents ${incidentsResponse.status}, events ${eventsResponse.status}`
        );
      }

      const incidentsPayload = await incidentsResponse.json();
      const eventsPayload = await eventsResponse.json();
      const incData = Array.isArray(incidentsPayload.data) ? incidentsPayload.data : [];
      const evtData = Array.isArray(eventsPayload.data) ? eventsPayload.data : [];

      setIncidents(incData);
      setEvents(evtData);
      if (evtData.length > 0) {
        setEventCount(evtData.length);
      }
      setLoading(false);
    }

    loadOverview().catch((error: unknown) => {
      if ((error as { name?: string }).name === "AbortError") return;
      console.error("Failed to load overview page data:", error);
      setIncidents([]);
      setEvents([]);
      setLoading(false);
    });

    return () => controller.abort();
  }, [setEventCount]);

  const critical =
    incidents.find((i) => i.severity === "critical" && i.status === "active") ||
    incidents.find((i) => i.severity === "critical") ||
    incidents[0];

  const others = incidents
    .filter((i) => i.id !== critical?.id && (i.status === "active" || i.status === "investigating"))
    .slice(0, 3);

  const severityCounts = {
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    medium: incidents.filter((i) => i.severity === "medium").length,
    low: incidents.filter((i) => i.severity === "low").length,
  };

  const activeIncidentsCount = incidents.filter(
    (i) => i.status === "active" || i.status === "investigating"
  ).length;

  return (
    <AppShell title="Overview">
      <div className="space-y-6 max-w-6xl fade-up">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
              Operational pulse
            </h2>
            <p className="text-[13px] text-zinc-500 mt-1 max-w-md">
              Noisy signals correlated into prioritized incidents — what needs
              attention right now.
            </p>
          </div>
          <Button
            onClick={runMainSimulation}
            disabled={simulation.running}
            size="md"
          >
            <Play className="h-3.5 w-3.5" />
            Run production simulation
          </Button>
        </div>

        {/* Product story pipeline */}
        <div className="rounded-lg border border-[#27272a] bg-[#121216] px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 text-[11px] font-medium min-w-max">
            <PipelineStep
              label={`${eventCount || events.length || 188} events`}
              active={eventCount > 0 || events.length > 0}
            />
            <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
            <PipelineStep
              label={
                simulation.candidates
                  ? `${simulation.candidates} candidates`
                  : "correlation"
              }
              active={!!simulation.candidates || simulationComplete}
            />
            <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
            <PipelineStep
              label={
                simulationComplete
                  ? `${incidents.length || 6} incidents`
                  : simulation.incidents
                  ? `${simulation.incidents} incidents`
                  : "incidents"
              }
              active={simulationComplete || simulation.incidents > 0}
            />
            <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
            <PipelineStep
              label="critical"
              active={simulationComplete}
              critical
            />
            <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
            <PipelineStep
              label="evidence → action"
              active={simulationComplete}
              ai
            />
          </div>
        </div>

        {(simulation.running || simulation.stage > 0) && (
          <SimulationProgress state={simulation} />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            <>
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
            </>
          ) : (
            <>
              <KPICard label="Events ingested" value={eventCount || events.length} />
              <KPICard
                label="Active incidents"
                value={
                  simulationComplete
                    ? activeIncidentsCount
                    : Math.max(0, simulation.incidents)
                }
              />
              <KPICard label="Correlated" value="94.6%" hint="of signals" />
              <KPICard label="Mean detect" value="42s" hint="last 24h" />
            </>
          )}
        </div>

        {/* Severity strip */}
        <div className="flex flex-wrap items-center gap-5 text-[12px]">
          <SeverityPill color="bg-red-500" label="Critical" count={severityCounts.critical} />
          <SeverityPill color="bg-orange-500" label="High" count={severityCounts.high} />
          <SeverityPill color="bg-yellow-500" label="Medium" count={severityCounts.medium} />
          <SeverityPill color="bg-emerald-500" label="Low" count={severityCounts.low} />
        </div>

        {/* Critical incident */}
        {critical && simulationComplete && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">
                Requires attention
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-red-500/20 to-transparent" />
            </div>
            <IncidentCard incident={critical} featured />
          </div>
        )}

        {!simulationComplete && simulation.stage >= 6 && (
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3">
            <p className="text-[13px] text-red-300/90 font-medium">
              Correlating operational signals with AI confidence…
            </p>
          </div>
        )}

        {simulationComplete && others.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2.5">
              Other active
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {others.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} />
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#27272a] bg-[#121216] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Event volume
              </h3>
              <span className="text-[10px] text-zinc-600 font-mono">Live Supabase Stream</span>
            </div>
            <EventVolumeChart events={events} />
          </div>
          <div className="rounded-lg border border-[#27272a] bg-[#121216] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Error rate
              </h3>
              <span className="text-[10px] text-zinc-600 font-mono">payment-api / services</span>
            </div>
            <ErrorRateChart events={events} serviceFilter="payment" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function PipelineStep({
  label,
  active,
  critical,
  ai,
}: {
  label: string;
  active?: boolean;
  critical?: boolean;
  ai?: boolean;
}) {
  return (
    <span
      className={
        active
          ? critical
            ? "rounded px-2 py-1 bg-red-500/15 text-red-400 border border-red-500/25"
            : ai
            ? "rounded px-2 py-1 bg-violet-500/15 text-violet-300 border border-violet-500/25"
            : "rounded px-2 py-1 bg-zinc-800 text-zinc-200 border border-zinc-700"
          : "rounded px-2 py-1 text-zinc-600 border border-transparent"
      }
    >
      {label}
    </span>
  );
}

function KPICard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#27272a] bg-[#121216] px-4 py-3.5">
      <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
      <p className="text-[22px] font-semibold tracking-tight text-zinc-50 mt-1 tabular leading-none">
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-zinc-600 mt-1.5">{hint}</p>
      )}
    </div>
  );
}

function SeverityPill({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-medium tabular">{count}</span>
    </div>
  );
}
