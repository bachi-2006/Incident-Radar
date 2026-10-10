"use client";

import type { Service } from "@/types";
import { healthColor } from "@/lib/utils";
import { ServiceSparkline } from "@/components/charts/ServiceSparkline";

export function ServiceCard({ service }: { service: Service }) {
  const sparkColor =
    service.health === "healthy"
      ? "#34d399"
      : service.health === "degraded"
      ? "#fb923c"
      : "#f87171";

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#121216] p-4 hover:border-zinc-700/80 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-medium text-zinc-100">
            {service.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                service.health === "healthy"
                  ? "bg-emerald-500"
                  : service.health === "degraded"
                  ? "bg-orange-500"
                  : "bg-red-500"
              }`}
            />
            <span
              className={`text-[11px] capitalize ${healthColor(service.health)}`}
            >
              {service.health}
            </span>
          </div>
        </div>
        <ServiceSparkline data={service.sparkline} color={sparkColor} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[11px]">
        <div>
          <p className="text-zinc-600">Requests</p>
          <p className="text-zinc-200 font-medium mt-0.5 tabular">
            {service.requestsPerMin}
            <span className="text-zinc-600 font-normal">k/min</span>
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Error rate</p>
          <p className="text-zinc-200 font-medium mt-0.5 tabular">
            {service.errorRate}%
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Latency</p>
          <p className="text-zinc-200 font-medium mt-0.5 tabular">
            {service.latencyMs}
            <span className="text-zinc-600 font-normal">ms</span>
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Incidents</p>
          <p className="text-zinc-200 font-medium mt-0.5 tabular">
            {service.activeIncidents}
          </p>
        </div>
      </div>
    </div>
  );
}
