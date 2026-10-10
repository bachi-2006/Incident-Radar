import { useMemo, useState } from "react";
import { events } from "../data";
import { Badge, formatTime, severityClass } from "../lib";

export function Events() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const sources = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.source)))], []);

  const rows = events.filter((e) => {
    const matchesQ = !q || `${e.message} ${e.service} ${e.id}`.toLowerCase().includes(q.toLowerCase());
    const matchesSource = source === "all" || e.source === source;
    return matchesQ && matchesSource;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Events</h2>
        <p className="mt-1 text-[13px] text-zinc-500">Ingested operational telemetry before correlation.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search message, service, id"
          className="w-full max-w-sm rounded-md border border-[#27272a] bg-[#121216] px-3 py-2 text-[13px] outline-none focus:border-blue-500/50"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border border-[#27272a] bg-[#121216] px-3 py-2 text-[13px]"
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#27272a]">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-[#121216] text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-[#1f1f24]">
                <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-500">{formatTime(e.timestamp)}</td>
                <td className="px-4 py-2.5">{e.service}</td>
                <td className="px-4 py-2.5 text-zinc-400">{e.source}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-400">{e.type}</td>
                <td className="px-4 py-2.5">
                  <Badge className={severityClass(e.severity)}>{e.severity}</Badge>
                </td>
                <td className="px-4 py-2.5 text-zinc-300">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
