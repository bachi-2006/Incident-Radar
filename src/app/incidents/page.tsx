"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import type { Incident } from "@/types";
import { CardSkeleton } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadIncidents() {
      setLoading(true);
      const response = await fetch("/api/incidents", {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load incidents: ${response.status}`);
      }

      const payload = await response.json();
      setIncidents(Array.isArray(payload.data) ? payload.data : []);
      setLoading(false);
    }

    loadIncidents().catch((error: unknown) => {
      if ((error as { name?: string }).name === "AbortError") return;
      console.error("Failed to load incidents page data:", error);
      setIncidents([]);
      setLoading(false);
    });

    return () => controller.abort();
  }, []);

  return (
    <AppShell title="Incidents">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">Incidents</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {loading ? "Loading..." : `${incidents.length} active and correlated incidents`}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No active incidents"
            description="Your production environment is healthy."
          />
        ) : (
          <div className="grid gap-3">
            {incidents.map((inc) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                featured={inc.severity === "critical"}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
