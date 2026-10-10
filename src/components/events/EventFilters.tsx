"use client";

import { Search } from "lucide-react";

interface Filters {
  search: string;
  service: string;
  source: string;
  severity: string;
}

export function EventFilters({
  filters,
  onChange,
  services,
  sources,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  services: string[];
  sources: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
        <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <input
          type="text"
          placeholder="Search events..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none w-full"
        />
      </div>

      <select
        value={filters.service}
        onChange={(e) => onChange({ ...filters, service: e.target.value })}
        className="rounded-md border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 px-2.5 py-1.5 outline-none focus:border-zinc-600"
      >
        <option value="all">All services</option>
        {services.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.source}
        onChange={(e) => onChange({ ...filters, source: e.target.value })}
        className="rounded-md border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 px-2.5 py-1.5 outline-none focus:border-zinc-600"
      >
        <option value="all">All sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.severity}
        onChange={(e) => onChange({ ...filters, severity: e.target.value })}
        className="rounded-md border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 px-2.5 py-1.5 outline-none focus:border-zinc-600"
      >
        <option value="all">All severities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="info">Info</option>
      </select>
    </div>
  );
}
