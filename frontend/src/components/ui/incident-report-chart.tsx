"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ShieldAlert } from "lucide-react";

export interface IncidentDataPoint {
  date: string;       // e.g. '8/19'
  fullDate: string;   // e.g. '19.08.2026'
  critical: number;
  high: number;
  medium: number;
}

const defaultIncidentData: IncidentDataPoint[] = [
  { date: "8/18", fullDate: "18.08.2026", critical: 1, high: 4, medium: 7 },
  { date: "8/19", fullDate: "19.08.2026", critical: 2, high: 5, medium: 9 },
  { date: "8/20", fullDate: "20.08.2026", critical: 4, high: 6, medium: 8 },
  { date: "8/21", fullDate: "21.08.2026", critical: 2, high: 7, medium: 11 },
  { date: "8/22", fullDate: "22.08.2026", critical: 3, high: 5, medium: 8 },
  { date: "8/23", fullDate: "23.08.2026", critical: 5, high: 8, medium: 12 },
  { date: "8/24", fullDate: "24.08.2026", critical: 3, high: 6, medium: 9 },
  { date: "8/25", fullDate: "25.08.2026", critical: 2, high: 4, medium: 7 },
];

interface IncidentReportChartProps {
  data?: IncidentDataPoint[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function IncidentReportChart({
  data,
  title = "Динамика тревожных сигналов",
  subtitle = "Мониторинг инцидентов и психологических факторов дезадаптации",
  className = "",
}: IncidentReportChartProps) {
  const chartData = data && data.length > 0 ? data : defaultIncidentData;

  const latestStats = useMemo(() => {
    const last = chartData[chartData.length - 1];
    return last || { critical: 0, high: 0, medium: 0 };
  }, [chartData]);

  return (
    <Card className={`bg-[#0a0a0a] border-zinc-800 text-white rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      <CardHeader className="pb-2 border-b border-zinc-900/80 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <CardTitle className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-zinc-400">
            {subtitle}
          </CardDescription>
        </div>

        {/* Live Indicator Pills */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#db2777] shadow-[0_0_8px_#db2777]" />
            <span>Критический: <b className="text-white">{latestStats.critical}</b></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#ec4899] shadow-[0_0_8px_#ec4899]" />
            <span>Высокий: <b className="text-white">{latestStats.high}</b></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#ffffff] shadow-[0_0_8px_#ffffff]" />
            <span>Средний: <b className="text-white">{latestStats.medium}</b></span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 15, bottom: 25 }}
            >
              <defs>
                {/* Neon Glow Filters */}
                <filter id="neon-glow-critical" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="neon-glow-high" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="neon-glow-medium" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Fill Gradients fading to transparent */}
                <linearGradient id="gradient-critical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#db2777" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#db2777" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="gradient-high" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="gradient-medium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Full Dotted Grid */}
              <CartesianGrid
                horizontal={true}
                vertical={true}
                strokeDasharray="4 4"
                stroke="#27272a"
              />

              {/* X Axis with -45 deg angled text */}
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={45}
                tick={{ fontSize: 11, fill: "#71717a", fontFamily: "Inter, sans-serif" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
              />

              {/* Y Axis is hidden per requirements */}
              <YAxis hide={true} domain={[0, "auto"]} />

              {/* Custom Dark Tooltip */}
              <Tooltip
                cursor={{
                  stroke: "#ec4899",
                  strokeWidth: 1.5,
                  strokeDasharray: "4 4",
                  strokeOpacity: 0.8,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const itemData = payload[0]?.payload as IncidentDataPoint;

                  return (
                    <div className="bg-[#121214]/95 border border-zinc-800 backdrop-blur-md rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[170px]">
                      <div className="text-[11px] font-bold text-zinc-400 border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                        <span>{itemData.fullDate}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Всего: {itemData.critical + itemData.high + itemData.medium}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Critical Row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-3.5 rounded-full bg-[#db2777] shadow-[0_0_6px_#db2777]" />
                            <span className="text-zinc-300 font-medium">Критический:</span>
                          </div>
                          <span className="font-mono font-bold text-[#db2777]">
                            {itemData.critical}
                          </span>
                        </div>

                        {/* High Row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-3.5 rounded-full bg-[#ec4899] shadow-[0_0_6px_#ec4899]" />
                            <span className="text-zinc-300 font-medium">Высокий:</span>
                          </div>
                          <span className="font-mono font-bold text-[#ec4899]">
                            {itemData.high}
                          </span>
                        </div>

                        {/* Medium Row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-3.5 rounded-full bg-[#ffffff] shadow-[0_0_6px_#ffffff]" />
                            <span className="text-zinc-300 font-medium">Средний:</span>
                          </div>
                          <span className="font-mono font-bold text-white">
                            {itemData.medium}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Glowing Neon Area / Line Layers */}
              <Area
                type="monotone"
                dataKey="medium"
                name="Средний"
                stroke="#ffffff"
                strokeWidth={3}
                fill="url(#gradient-medium)"
                filter="url(#neon-glow-medium)"
                activeDot={{ r: 5, fill: "#ffffff", stroke: "#0a0a0a", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="high"
                name="Высокий"
                stroke="#ec4899"
                strokeWidth={3}
                fill="url(#gradient-high)"
                filter="url(#neon-glow-high)"
                activeDot={{ r: 5, fill: "#ec4899", stroke: "#0a0a0a", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="critical"
                name="Критический"
                stroke="#db2777"
                strokeWidth={3}
                fill="url(#gradient-critical)"
                filter="url(#neon-glow-critical)"
                activeDot={{ r: 6, fill: "#db2777", stroke: "#0a0a0a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default IncidentReportChart;
