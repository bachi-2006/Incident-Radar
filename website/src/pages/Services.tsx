import { services } from "../data";
import { Sparkline, healthClass } from "../lib";

export function Services() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Services</h2>
        <p className="mt-1 text-[13px] text-zinc-500">Health of the demo production graph backing Incident Radar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="rounded-xl border border-[#27272a] bg-[#121216] p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{s.name}</h3>
                <p className={`mt-0.5 text-[12px] capitalize ${healthClass(s.health)}`}>{s.health}</p>
              </div>
              <Sparkline values={s.sparkline} color={s.health === "healthy" ? "#22c55e" : "#f97316"} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <dt className="text-zinc-500">rpm</dt>
                <dd className="tabular font-medium">{s.requestsPerMin}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">error rate</dt>
                <dd className="tabular font-medium">{s.errorRate}%</dd>
              </div>
              <div>
                <dt className="text-zinc-500">latency</dt>
                <dd className="tabular font-medium">{s.latencyMs}ms</dd>
              </div>
              <div>
                <dt className="text-zinc-500">incidents</dt>
                <dd className="tabular font-medium">{s.activeIncidents}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
