"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function ServiceSparkline({
  data,
  color = "#60a5fa",
}: {
  data: number[];
  color?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !data || data.length === 0) {
    return <div className="h-8 w-24 bg-zinc-800/20 rounded animate-pulse" />;
  }

  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
