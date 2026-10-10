"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SeverityBadge, Badge } from "@/components/ui/Badge";
import { ConfidenceScore } from "@/components/incidents/ConfidenceScore";
import { EvidenceCard } from "@/components/incidents/EvidenceCard";
import { IncidentTimeline } from "@/components/incidents/IncidentTimeline";
import { RecommendationCard } from "@/components/incidents/RecommendationCard";
import { LyzrVerificationPanel } from "@/components/incidents/LyzrVerificationPanel";
import { EventTable } from "@/components/events/EventTable";
import type { Incident, Event } from "@/types";
import { ArrowLeft } from "lucide-react";
import { CardSkeleton } from "@/components/ui/LoadingState";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadIncident() {
      setLoading(true);
      const response = await fetch(`/api/incidents/${id}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.status === 404) {
        setIncident(null);
        setEvents([]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load incident ${id}: ${response.status}`);
      }

      const payload = await response.json();
      setIncident(payload.data ?? null);
      setEvents(Array.isArray(payload.data?.events) ? payload.data.events : []);
      setLoading(false);
    }

    loadIncident().catch((error: unknown) => {
      if ((error as { name?: string }).name === "AbortError") return;
      console.error("Failed to load incident detail page data:", error);
      setIncident(null);
      setEvents([]);
      setLoading(false);
    });

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Investigation">
        <div className="space-y-4 max-w-4xl">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={6} />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell title="Investigation">
        <div className="text-center py-16">
          <p className="text-zinc-400 text-[13px]">Incident not found.</p>
          <Link
            href="/incidents"
            className="text-[13px] text-blue-400 hover:text-blue-300 mt-2 inline-block"
          >
            Back to incidents
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={incident.title}>
      <div className="space-y-6 max-w-4xl fade-up">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Incidents
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <SeverityBadge severity={incident.severity} />
            <Badge variant="mono">{incident.id}</Badge>
            <Badge variant="status">{incident.status}</Badge>
            <Badge variant="ai">{incident.confidence}% confidence</Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            {incident.title}
          </h1>
          <p className="text-[13px] text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* AI Investigation */}
        <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-[#121216] to-[#121216] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-violet-500/10 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/90">
              AI Investigation
            </h3>
          </div>
          <div className="p-5 flex flex-col sm:flex-row gap-6 items-start">
            <ConfidenceScore value={incident.confidence} />
            <div className="flex-1 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Likely root cause
              </p>
              <p className="text-[14px] text-zinc-200 leading-relaxed">
                {incident.rootCause}
              </p>
            </div>
          </div>
        </div>

        {/* AI Reasoning & Reverification */}
        <LyzrVerificationPanel incident={incident} events={events} />

        {incident.evidence.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Evidence chain
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {incident.evidence.map((ev, i) => (
                <EvidenceCard key={ev.id} evidence={ev} step={i + 1} />
              ))}
            </div>
          </div>
        )}

        {incident.timeline.length > 0 && (
          <div className="rounded-lg border border-[#27272a] bg-[#121216] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-5">
              Causal timeline
            </h3>
            <IncidentTimeline items={incident.timeline} />
          </div>
        )}

        {incident.recommendations.length > 0 && (
          <RecommendationCard recommendations={incident.recommendations} />
        )}

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Correlated events · {events.length}
          </h3>
          <EventTable events={events} />
        </div>
      </div>
    </AppShell>
  );
}

