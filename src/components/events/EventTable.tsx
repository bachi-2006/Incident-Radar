"use client";

import type { Event } from "@/types";
import { SeverityBadge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/utils";
import Link from "next/link";

export function EventTable({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-[#27272a] bg-[#121216] text-center py-14 text-[13px] text-zinc-500">
        No events match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#27272a]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#1f1f24] bg-[#121216] text-left">
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Time
            </th>
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Service
            </th>
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Source
            </th>
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Event
            </th>
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Severity
            </th>
            <th className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Incident
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              className="border-b border-[#1f1f24]/80 hover:bg-zinc-900/40 transition-colors"
            >
              <td className="px-3.5 py-2 font-mono text-[11px] text-zinc-500 whitespace-nowrap tabular">
                {formatTime(e.timestamp)}
              </td>
              <td className="px-3.5 py-2 text-zinc-300 whitespace-nowrap text-[12px]">
                {e.service}
              </td>
              <td className="px-3.5 py-2 text-zinc-500 whitespace-nowrap text-[12px]">
                {e.source}
              </td>
              <td className="px-3.5 py-2 text-zinc-200 max-w-[280px] truncate text-[12px]">
                {e.message}
              </td>
              <td className="px-3.5 py-2">
                <SeverityBadge severity={e.severity} />
              </td>
              <td className="px-3.5 py-2">
                {e.incidentId ? (
                  <Link
                    href={`/incidents/${e.incidentId}`}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-mono"
                  >
                    {e.incidentId}
                  </Link>
                ) : (
                  <span className="text-[11px] text-zinc-700">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
