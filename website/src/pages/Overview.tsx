import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { incidents, kpis, services } from "../data";
import { Badge, Sparkline, cn, policyClass, severityClass } from "../lib";

export function Overview() {
  const critical = incidents.find((i) => i.severity === "critical") ?? incidents[0];
  const others = incidents.filter((i) => i.id !== critical.id).slice(0, 3);
  const counts = {
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    medium: incidents.filter((i) => i.severity === "medium").length,
    low: incidents.filter((i) => i.severity === "low").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Operational pulse</h2>
        <p className="mt-1 max-w-md text-[13px] text-zinc-500">
          Noisy signals correlated into prioritized incidents — what needs attention right now.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#27272a] bg-[#121216] px-4 py-3">
        <div className="flex min-w-max items-center gap-2 text-[11px] font-medium">
          <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200">{kpis.eventsIngested} events</span>
          <ArrowRight className="h-3 w-3 text-zinc-700" />
          <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200">correlation</span>
          <ArrowRight className="h-3 w-3 text-zinc-700" />
          <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200">{incidents.length} incidents</span>
          <ArrowRight className="h-3 w-3 text-zinc-700" />
          <span className="rounded border border-red-500/25 bg-red-500/15 px-2 py-1 text-red-400">critical</span>
          <ArrowRight className="h-3 w-3 text-zinc-700" />
          <span className="rounded border border-violet-500/25 bg-violet-500/15 px-2 py-1 text-violet-300">evidence → action</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Events ingested", kpis.eventsIngested],
          ["Active incidents", kpis.activeIncidents],
          ["Correlated", kpis.correlated],
          ["Mean detect", kpis.meanDetect],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#27272a] bg-[#121216] px-4 py-3.5">
            <p className="text-[11px] font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular leading-none">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-5 text-[12px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-red-500" /> Critical <b className="font-medium text-zinc-200">{counts.critical}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-orange-500" /> High <b className="font-medium text-zinc-200">{counts.high}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Medium <b className="font-medium text-zinc-200">{counts.medium}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Low <b className="font-medium text-zinc-200">{counts.low}</b>
        </span>
      </div>

      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">Requires attention</span>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
        </div>
        <Link
          to={`/app/incidents/${critical.id}`}
          className="block rounded-xl border border-red-500/20 bg-red-950/20 p-5 hover:border-red-500/40"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityClass(critical.severity)}>{critical.severity}</Badge>
            <Badge className={policyClass(critical.policy)}>{critical.policy}</Badge>
            <span className="font-mono text-[12px] text-zinc-500">{critical.id}</span>
            <span className="ml-auto text-[12px] text-zinc-500">{critical.confidence}% confidence</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{critical.title}</h3>
          <p className="mt-1 text-[13px] text-zinc-400">{critical.description}</p>
          <p className="mt-3 text-[12px] text-zinc-500">
            Proposed action <span className="font-mono text-zinc-300">{critical.proposedAction}</span>
          </p>
        </Link>
      </div>

      <div>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Other active</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((inc) => (
            <Link
              key={inc.id}
              to={`/app/incidents/${inc.id}`}
              className="rounded-lg border border-[#27272a] bg-[#121216] p-4 hover:border-zinc-600"
            >
              <div className="flex items-center gap-2">
                <Badge className={severityClass(inc.severity)}>{inc.severity}</Badge>
                <Badge className={policyClass(inc.policy)}>{inc.policy}</Badge>
              </div>
              <h4 className="mt-2 text-sm font-semibold">{inc.title}</h4>
              <p className="mt-1 text-[12px] text-zinc-500">{inc.service} · {inc.correlatedCount} events</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#27272a] bg-[#121216] p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Service latency</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {services.slice(0, 4).map((s) => (
            <div key={s.id} className="rounded-md border border-[#1f1f24] p-3">
              <div className="flex items-center justify-between text-[12px]">
                <span>{s.name}</span>
                <span className={cn("tabular", s.errorRate > 5 ? "text-red-400" : "text-zinc-400")}>{s.latencyMs}ms</span>
              </div>
              <Sparkline values={s.sparkline} color={s.errorRate > 5 ? "#ef4444" : "#3b82f6"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
