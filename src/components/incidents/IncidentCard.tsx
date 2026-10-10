"use client";

import Link from "next/link";
import { SeverityBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Incident } from "@/types";
import { ArrowRight, Layers, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export function IncidentCard({
  incident,
  featured = false,
}: {
  incident: Incident;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-red-500/20 bg-[#121216]">
        {/* Left critical rail */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-red-500 via-red-500 to-red-700/40" />
        {/* Soft glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative p-5 pl-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={incident.severity} />
              <Badge variant="ai">{incident.confidence}% confidence</Badge>
              <Badge variant="mono">{incident.id}</Badge>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-zinc-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-red-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono tabular">
                {new Date(incident.startTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-red-400/90 font-medium">Active</span>
            </div>
          </div>

          <h2 className="text-[17px] font-semibold tracking-tight text-zinc-50 mb-1.5">
            {incident.title}
          </h2>
          <p className="text-[13px] text-zinc-400 leading-relaxed max-w-2xl mb-4">
            {incident.description}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-zinc-500 mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-zinc-300 font-medium tabular">
                {incident.correlatedCount}
              </span>{" "}
              correlated events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-zinc-600" />
              {incident.affectedServices.join(" · ")}
            </span>
            <span className="font-mono text-zinc-600">{incident.service}</span>
          </div>

          <div className="rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-3.5 py-2.5 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90 mb-1">
              Likely cause
            </p>
            <p className="text-[13px] text-zinc-300 leading-snug">
              {incident.rootCause}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/incidents/${incident.id}`}>
              <Button size="sm">
                Investigate
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/events`}>
              <Button variant="secondary" size="sm">
                View events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/incidents/${incident.id}`} className="block group">
      <div
        className={cn(
          "relative rounded-lg border border-[#27272a] bg-[#121216] p-4",
          "hover:border-zinc-700 hover:bg-[#141418] transition-colors"
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-3 bottom-3 w-[2px] rounded-full",
            incident.severity === "critical" && "bg-red-500",
            incident.severity === "high" && "bg-orange-500",
            incident.severity === "medium" && "bg-yellow-500",
            incident.severity === "low" && "bg-emerald-500"
          )}
        />
        <div className="pl-2">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={incident.severity} />
              <span className="text-[11px] text-zinc-600 font-mono tabular">
                {incident.confidence}%
              </span>
            </div>
            <span className="text-[11px] text-zinc-600 tabular shrink-0">
              {incident.correlatedCount} events
            </span>
          </div>
          <h3 className="text-[13px] font-medium text-zinc-100 group-hover:text-white mb-1">
            {incident.title}
          </h3>
          <p className="text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">
            {incident.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
