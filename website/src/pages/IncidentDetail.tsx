import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { events, incidents } from "../data";
import { Badge, formatTime, policyClass, severityClass, statusClass } from "../lib";

export function IncidentDetail() {
  const { id } = useParams();
  const incident = incidents.find((i) => i.id === id);
  const related = events.filter((e) => e.incidentId === id);

  if (!incident) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] text-zinc-400">Incident not found.</p>
        <Link to="/app/incidents" className="mt-2 inline-block text-[13px] text-blue-400">
          Back to incidents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/app/incidents" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" />
        Incidents
      </Link>

      <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-zinc-500">{incident.id}</span>
          <Badge className={severityClass(incident.severity)}>{incident.severity}</Badge>
          <Badge className={statusClass(incident.status)}>{incident.status}</Badge>
          <Badge className={policyClass(incident.policy)}>{incident.policy}</Badge>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{incident.title}</h2>
        <p className="mt-2 text-[13px] text-zinc-400">{incident.description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Confidence" value={`${incident.confidence}%`} />
          <Stat label="Correlated events" value={incident.correlatedCount} />
          <Stat label="Started" value={formatTime(incident.startTime)} />
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Root cause</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">{incident.rootCause}</p>
        <p className="mt-3 text-[12px] text-zinc-500">
          Proposed action <span className="font-mono text-zinc-200">{incident.proposedAction}</span>
        </p>
        <p className="mt-1 text-[12px] text-zinc-500">Affected: {incident.affectedServices.join(", ")}</p>
      </div>

      {incident.evidence.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Evidence</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {incident.evidence.map((e) => (
              <div key={e.id} className="rounded-lg border border-[#27272a] bg-[#121216] p-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{e.source}</span>
                  <span className="font-mono">{e.timestamp}</span>
                </div>
                <p className="mt-1 text-[13px] font-medium">{e.title}</p>
                <p className="text-[12px] text-zinc-400">{e.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {incident.timeline.length > 0 && (
        <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Timeline</h3>
          <ol className="space-y-3">
            {incident.timeline.map((t) => (
              <li key={t.time + t.title} className="flex gap-3 text-[13px]">
                <span className="w-12 shrink-0 font-mono text-[12px] text-zinc-500">{t.time}</span>
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-[12px] text-zinc-500">{t.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Recommendations</h3>
        <div className="space-y-2">
          {incident.recommendations.map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border p-3 ${r.primary ? "border-violet-500/30 bg-violet-950/20" : "border-[#27272a] bg-[#121216]"}`}
            >
              <p className="text-[13px] font-medium">{r.title}</p>
              {r.description && <p className="mt-1 text-[12px] text-zinc-400">{r.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Linked events</h3>
          <div className="space-y-2">
            {related.map((e) => (
              <div key={e.id} className="flex gap-3 text-[12px]">
                <span className="w-16 shrink-0 font-mono text-zinc-500">{formatTime(e.timestamp)}</span>
                <span className="text-zinc-300">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[#1f1f24] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular">{value}</div>
    </div>
  );
}
