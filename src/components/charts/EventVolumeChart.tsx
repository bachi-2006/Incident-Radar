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

interface EventVolumeChartProps {
  events?: Event[];
}

export function EventVolumeChart({ events }: EventVolumeChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { time: "06:00", events: 8 },
        { time: "07:00", events: 15 },
        { time: "08:00", events: 22 },
        { time: "09:00", events: 35 },
        { time: "09:30", events: 72 },
        { time: "10:00", events: 125 },
      ];
    }

    const buckets: Record<string, number> = {};
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const evt of sorted) {
      try {
        const d = new Date(evt.timestamp);
        const hours = String(d.getUTCHours()).padStart(2, "0");
        const minutes = Math.floor(d.getUTCMinutes() / 15) * 15;
        const key = `${hours}:${String(minutes).padStart(2, "0")}`;
        buckets[key] = (buckets[key] || 0) + 1;
      } catch {
        // Skip
      }
    }

    let runningTotal = 0;
    const result = Object.entries(buckets).map(([time, count]) => {
      runningTotal += count;
      return { time, events: count, cumulative: runningTotal };
    });

    return result.length > 0 ? result.slice(-12) : [{ time: "Now", events: events.length }];
  }, [events]);

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
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Line
            type="monotone"
            dataKey="events"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#60a5fa" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
