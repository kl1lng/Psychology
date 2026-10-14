'use client';

import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Activity, Sparkles } from 'lucide-react';

interface DayData {
  date: string;
  avg_stress: number;
  entries_count: number;
}

interface StressChartProps {
  data: DayData[];
  title?: string;
  color?: string;
  gradientId?: string;
  className?: string;
}

interface CustomTooltipPayload {
  value: number;
  payload: DayData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl p-3 shadow-md select-none">
      <p className="text-gray-400 text-xs font-medium mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-gray-900 dark:text-white font-bold text-base">
          {val.toFixed(1)}
        </span>
        <span className="text-gray-400 text-xs font-normal">/ 10</span>
      </div>
      {payload[0].payload.entries_count > 0 && (
        <p className="text-gray-500 text-[11px] mt-1 font-medium">
          Записей: {payload[0].payload.entries_count}
        </p>
      )}
    </div>
  );
};

export default function StressChart({
  data,
  title,
  color = '#6366F1',
  gradientId = 'smoothAreaGradient',
  className = '',
}: StressChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[260px] w-full bg-gray-50 dark:bg-neutral-900/40 rounded-2xl animate-pulse" />
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  const avg =
    data.length > 0
      ? data.reduce((s, d) => s + d.avg_stress, 0) / data.length
      : 0;

  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* ─── Header & Pill Badges ─── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title || 'Динамика эмоционального состояния'}
            </h4>
            <p className="text-xs text-gray-400 font-normal">
              Ежедневный уровень стресса по шкале от 1 до 10
            </p>
          </div>
        </div>

        {/* Header Statistic Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-900/50">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Средний: {avg.toFixed(1)} / 10</span>
        </div>
      </div>

      {/* ─── Smooth Area Chart ─── */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formatted}
            margin={{ top: 10, right: 10, bottom: 0, left: -25 }}
          >
            {/* Gradient Fill Definition */}
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Dotted Grid Background */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />

            {/* X-Axis */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 12,
                fill: '#9CA3AF',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />

            {/* Y-Axis */}
            <YAxis
              domain={[1, 10]}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 12,
                fill: '#9CA3AF',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            {/* Smooth Spline Curve Area */}
            <Area
              type="monotone"
              dataKey="avg_stress"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: color,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
