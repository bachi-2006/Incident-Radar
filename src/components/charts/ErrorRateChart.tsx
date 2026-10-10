"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Event } from "@/types";

interface ErrorRateChartProps {
  events?: Event[];
  serviceFilter?: string;
}

export function ErrorRateChart({ events, serviceFilter }: ErrorRateChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { time: "09:00", rate: 0.6 },
        { time: "09:10", rate: 0.8 },
        { time: "09:30", rate: 1.2 },
        { time: "09:32", rate: 4.5 },
        { time: "09:34", rate: 18 },
        { time: "09:35", rate: 32 },
        { time: "09:36", rate: 35 },
      ];
    }

    const relevant = serviceFilter
      ? events.filter((e) => e.service.toLowerCase().includes(serviceFilter.toLowerCase()))
      : events;

    const buckets: Record<string, { total: number; errors: number }> = {};
    const sorted = [...relevant].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const evt of sorted) {
      try {
        const d = new Date(evt.timestamp);
        const hours = String(d.getUTCHours()).padStart(2, "0");
        const minutes = Math.floor(d.getUTCMinutes() / 10) * 10;
        const key = `${hours}:${String(minutes).padStart(2, "0")}`;

        if (!buckets[key]) buckets[key] = { total: 0, errors: 0 };
        buckets[key].total += 1;
        if (
          evt.severity === "critical" ||
          evt.severity === "high" ||
          evt.type === "error" ||
          evt.message.toLowerCase().includes("fail") ||
          evt.message.toLowerCase().includes("error")
        ) {
          buckets[key].errors += 1;
        }
      } catch {
        // Skip
      }
    }

    const result = Object.entries(buckets).map(([time, data]) => ({
      time,
      rate: data.total > 0 ? Math.round((data.errors / data.total) * 100 * 10) / 10 : 0,
    }));

    return result.length > 0 ? result.slice(-12) : [{ time: "09:35", rate: 35 }];
  }, [events, serviceFilter]);

  if (!mounted) {
    return <div className="h-48 w-full bg-zinc-900/40 rounded-md animate-pulse" />;
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: any) => [`${value}%`, "Error rate"]}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#f87171"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f87171" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
