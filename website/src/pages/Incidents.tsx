import { Link } from "react-router-dom";
import { incidents } from "../data";
import { Badge, policyClass, severityClass, statusClass, formatTime } from "../lib";

export function Incidents() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Incidents</h2>
        <p className="mt-1 text-[13px] text-zinc-500">Correlated clusters with policy decisions from the Workato orchestrator.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#27272a]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#121216] text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Incident</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Policy</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Confidence</th>
              <th className="px-4 py-2.5 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} className="border-t border-[#1f1f24] hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{inc.id}</td>
                <td className="px-4 py-3">
                  <Link to={`/app/incidents/${inc.id}`} className="font-medium text-zinc-100 hover:text-blue-300">
                    {inc.title}
                  </Link>
                  <div className="text-[11px] text-zinc-500">{inc.service}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={severityClass(inc.severity)}>{inc.severity}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={policyClass(inc.policy)}>{inc.policy}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusClass(inc.status)}>{inc.status}</Badge>
                </td>
                <td className="px-4 py-3 tabular">{inc.confidence}%</td>
                <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">{formatTime(inc.startTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
