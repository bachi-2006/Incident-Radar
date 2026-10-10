"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EventTable } from "@/components/events/EventTable";
import { EventFilters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { CardSkeleton } from "@/components/ui/LoadingState";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    service: "all",
    source: "all",
    severity: "all",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.service !== "all") params.set("service", filters.service);
      if (filters.source !== "all") params.set("source", filters.source);
      if (filters.severity !== "all") params.set("severity", filters.severity);

      const query = params.toString();
      const response = await fetch(`/api/events${query ? `?${query}` : ""}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status}`);
      }

      const payload = await response.json();
      setEvents(Array.isArray(payload.data) ? payload.data.slice(0, 40) : []);
      setLoading(false);
    }

    loadEvents().catch((error: unknown) => {
      if ((error as { name?: string }).name === "AbortError") return;
      console.error("Failed to load events page data:", error);
      setEvents([]);
      setLoading(false);
    });

    return () => controller.abort();
  }, [filters]);

  const services = useMemo(
    () => Array.from(new Set(events.map((e) => e.service))).sort(),
    [events]
  );
  const sources = useMemo(
    () => Array.from(new Set(events.map((e) => e.source))).sort(),
    [events]
  );

  return (
    <AppShell title="Operational Events">
      <div className="space-y-5 max-w-7xl">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">
            Operational Events
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {loading ? "Loading..." : `${events.length} events`}
          </p>
        </div>

        <EventFilters
          filters={filters}
          onChange={setFilters}
          services={services}
          sources={sources}
        />

        {loading ? (
          <CardSkeleton lines={8} />
        ) : (
          <EventTable events={events} />
        )}
      </div>
    </AppShell>
  );
}
