'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
  BarChart2,
  Calendar,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocalizedChartDate } from '@/lib/chart-dates';

export { formatLocalizedChartDate } from '@/lib/chart-dates';

export interface MetricDataPoint {
  date: string;
  displayDate?: string;
  value: number;
  secondaryValue?: number; // e.g. mood logs or secondary series
  label?: string;
}

export type PeriodOption = '7d' | '14d' | '30d';
export type ChartType = 'area' | 'bar';

export interface AnalyticsMetricCardProps {
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  unit?: string;
  data?: MetricDataPoint[];
  periodData?: Record<PeriodOption, MetricDataPoint[]>;
  initialPeriod?: PeriodOption;
  initialChartType?: ChartType;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'violet';
  lang?: 'ru' | 'kk';
  isLoading?: boolean;
  className?: string;
  onPeriodChange?: (period: PeriodOption) => void;
  onChartTypeChange?: (type: ChartType) => void;
}

const COLOR_SCHEMES = {
  indigo: {
    stroke: '#6366f1',
    fillStart: 'rgba(99, 102, 241, 0.40)',
    fillEnd: 'rgba(99, 102, 241, 0.00)',
    bar: '#6366f1',
    barHover: '#4f46e5',
    secondary: '#a5b4fc',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50',
    glow: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    activeBtn: 'bg-indigo-600 text-white shadow-indigo-500/25',
  },
  emerald: {
    stroke: '#10b981',
    fillStart: 'rgba(16, 185, 129, 0.40)',
    fillEnd: 'rgba(16, 185, 129, 0.00)',
    bar: '#10b981',
    barHover: '#059669',
    secondary: '#6ee7b7',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
    glow: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    activeBtn: 'bg-emerald-600 text-white shadow-emerald-500/25',
  },
  cyan: {
    stroke: '#06b6d4',
    fillStart: 'rgba(6, 182, 212, 0.40)',
    fillEnd: 'rgba(6, 182, 212, 0.00)',
    bar: '#06b6d4',
    barHover: '#0891b2',
    secondary: '#67e8f9',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/50',
    glow: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    activeBtn: 'bg-cyan-600 text-white shadow-cyan-500/25',
  },
  amber: {
    stroke: '#f59e0b',
    fillStart: 'rgba(245, 158, 11, 0.40)',
    fillEnd: 'rgba(245, 158, 11, 0.00)',
    bar: '#f59e0b',
    barHover: '#d97706',
    secondary: '#fcd34d',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
    glow: 'from-amber-500/10 via-amber-500/5 to-transparent',
    accentText: 'text-amber-600 dark:text-amber-400',
    activeBtn: 'bg-amber-600 text-white shadow-amber-500/25',
  },
  rose: {
    stroke: '#f43f5e',
    fillStart: 'rgba(244, 63, 94, 0.40)',
    fillEnd: 'rgba(244, 63, 94, 0.00)',
    bar: '#f43f5e',
    barHover: '#e11d48',
    secondary: '#fda4af',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-100 dark:border-rose-900/50',
    glow: 'from-rose-500/10 via-rose-500/5 to-transparent',
    accentText: 'text-rose-600 dark:text-rose-400',
    activeBtn: 'bg-rose-600 text-white shadow-rose-500/25',
  },
  violet: {
    stroke: '#8b5cf6',
    fillStart: 'rgba(139, 92, 246, 0.40)',
    fillEnd: 'rgba(139, 92, 246, 0.00)',
    bar: '#8b5cf6',
    barHover: '#7c3aed',
    secondary: '#c4b5fd',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-100 dark:border-purple-900/50',
    glow: 'from-violet-500/10 via-violet-500/5 to-transparent',
    accentText: 'text-violet-600 dark:text-violet-400',
    activeBtn: 'bg-violet-600 text-white shadow-violet-500/25',
  },
};

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  title,
  subtitle,
  badgeLabel,
  unit,
  data,
  periodData,
  initialPeriod = '14d',
  initialChartType = 'area',
  colorScheme = 'indigo',
  lang = 'ru',
  isLoading = false,
  className,
  onPeriodChange,
  onChartTypeChange,
}) => {
  const [period, setPeriod] = useState<PeriodOption>(initialPeriod);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);

  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.indigo;

  // Periods config
  const periodDaysMap: Record<PeriodOption, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
  };

  const periodLabels = useMemo(() => {
    return {
      '7d': lang === 'kk' ? '7 күн' : '7 дней',
      '14d': lang === 'kk' ? '14 күн' : '14 дней',
      '30d': lang === 'kk' ? '30 күн' : '30 дней',
    };
  }, [lang]);

  // Selected chart data
  const currentChartData = useMemo(() => {
    if (periodData && periodData[period]) {
      return periodData[period];
    }
    if (data && data.length > 0) {
      // slice according to period days
      const days = periodDaysMap[period];
      return data.slice(-days);
    }
    // Fallback demo data
    return [];
  }, [periodData, data, period, lang]);

  // Computed metrics (Peak, Low, Avg, Total, Today, Delta)
  const metrics = useMemo(() => {
    if (!currentChartData || currentChartData.length === 0) {
      return { total: 0, peak: 0, low: 0, avg: 0, today: 0, todayDelta: 0, trendPct: 0, isTrendPositive: true };
    }

    const values = currentChartData.map((d) => d.value);
    const total = values.reduce((acc, v) => acc + v, 0);
    const peak = Math.max(...values);
    const low = Math.min(...values);
    const avg = Math.round((total / values.length) * 10) / 10;

    const today = values[values.length - 1] ?? 0;
    const yesterday = values[values.length - 2] ?? today;
    const todayDelta = today - yesterday;

    // Compare first half vs second half for trend percentage
    const half = Math.floor(values.length / 2);
    const firstHalfSum = values.slice(0, half).reduce((a, b) => a + b, 0) || 1;
    const secondHalfSum = values.slice(half).reduce((a, b) => a + b, 0);
    const trendPct = Math.round(((secondHalfSum - firstHalfSum) / firstHalfSum) * 100);
    const isTrendPositive = trendPct >= 0;

    return {
      total,
      peak,
      low,
      avg,
      today,
      todayDelta,
      trendPct: Math.abs(trendPct),
      isTrendPositive,
    };
  }, [currentChartData]);

  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod);
    if (onPeriodChange) onPeriodChange(newPeriod);
  };

  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType);
    if (onChartTypeChange) onChartTypeChange(newType);
  };

  const defaultTitle = lang === 'kk' ? 'Консультациялар мен өтініштер динамикасы' : 'Динамика консультаций и обращений';
  const defaultSubtitle = lang === 'kk' ? 'Психологқа жазылулар мен ЖИ көмекші белсенділігі' : 'Сессии со специалистом и сеансы самопомощи';
  const defaultUnit = lang === 'kk' ? 'өтініш' : 'обращений';

  const gradientId = `metric-gradient-${colorScheme}`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-xs font-sans',
        'bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800',
        className
      )}
    >
      {/* ─── DOT GRID MATRIX BACKGROUND ─────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(120, 120, 140, 0.45) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Subtle ambient gradient overlay */}
      <div
        className={cn(
          'pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br blur-3xl opacity-30 dark:opacity-20',
          colors.glow
        )}
      />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between h-full">
        {/* ─── TOP SECTION: TITLE, STATS & CONTROLS ─────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border shadow-2xs',
                  colors.badge
                )}
              >
                <Activity size={12} className="animate-pulse" />
                {badgeLabel || (lang === 'kk' ? 'Аналитика' : 'Текущие показатели')}
              </span>

              {/* Trend Pill */}
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border',
                  metrics.isTrendPositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                )}
                title={lang === 'kk' ? 'Алдыңғы кезеңмен салыстырғанда' : 'В сравнении с предшествующим периодом'}
              >
                {metrics.isTrendPositive ? (
                  <TrendingUp size={13} className="shrink-0" />
                ) : (
                  <TrendingDown size={13} className="shrink-0" />
                )}
                <span>
                  {metrics.isTrendPositive ? '+' : '-'}
                  {metrics.trendPct}%
                </span>
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              {title || defaultTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle || defaultSubtitle}
            </p>

            {/* Main Total Big Number */}
            <div className="pt-2 flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                {isLoading ? '...' : metrics.total}
              </span>
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {unit || defaultUnit}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                ({lang === 'kk' ? `соңғы ${periodDaysMap[period]} күнде` : `за ${periodDaysMap[period]} дн.`})
              </span>
            </div>
          </div>

          {/* ─── TOP RIGHT CONTROLS: PERIOD SELECTOR & CHART TOGGLE ─────── */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            {/* Period Segmented Toggle */}
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-2xs">
              {(['7d', '14d', '30d'] as PeriodOption[]).map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
                      isActive
                        ? cn(colors.activeBtn, 'shadow-sm')
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    )}
                  >
                    {periodLabels[p]}
                  </button>
                );
              })}
            </div>

            {/* Chart Type Toggle */}
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-2xs">
              <button
                onClick={() => handleChartTypeChange('area')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  chartType === 'area'
                    ? cn(colors.activeBtn, 'shadow-sm')
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
                title={lang === 'kk' ? 'Сызықтық график' : 'Линейный график'}
              >
                <LineChartIcon size={15} />
              </button>
              <button
                onClick={() => handleChartTypeChange('bar')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  chartType === 'bar'
                    ? cn(colors.activeBtn, 'shadow-sm')
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
                title={lang === 'kk' ? 'Бағандық график' : 'Столбчатый график'}
              >
                <BarChart2 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── CENTER: RECHARTS INTERACTIVE CHART ──────────────────────── */}
        <div className="relative w-full h-48 sm:h-56 my-2">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-800/20 rounded-2xl animate-pulse text-xs text-zinc-400">
              {lang === 'kk' ? 'Деректер жүктелуде...' : 'Загрузка данных...'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={currentChartData}
                  margin={{ top: 10, right: 12, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={colors.stroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      formatLocalizedChartDate(val, lang, { format: 'short' })
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: '#9CA3AF',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                    dy={4}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: '#9CA3AF',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as MetricDataPoint;
                      const formattedDate = formatLocalizedChartDate(
                        item.date,
                        lang,
                        { format: 'full' }
                      );

                      return (
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Calendar size={12} className="text-zinc-400" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors.stroke }}
                            />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {unit || defaultUnit}:
                            </span>
                            <span className="font-extrabold text-zinc-900 dark:text-white">
                              {item.value}
                            </span>
                          </div>
                          {item.secondaryValue !== undefined && (
                            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-zinc-400" />
                              <span>{lang === 'kk' ? 'Көңіл-күй жазбалары:' : 'Дневник настроения:'}</span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {item.secondaryValue}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.stroke}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    activeDot={{
                      r: 6,
                      stroke: colors.stroke,
                      strokeWidth: 2,
                      fill: '#ffffff',
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={currentChartData}
                  margin={{ top: 10, right: 12, left: -24, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(150, 150, 150, 0.12)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      formatLocalizedChartDate(val, lang, { format: 'short' })
                    }
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(150, 150, 150, 0.15)' }}
                    dy={4}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as MetricDataPoint;
                      const formattedDate = formatLocalizedChartDate(
                        item.date,
                        lang,
                        { format: 'full' }
                      );

                      return (
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Calendar size={12} className="text-zinc-400" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors.stroke }}
                            />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {unit || defaultUnit}:
                            </span>
                            <span className="font-extrabold text-zinc-900 dark:text-white">
                              {item.value}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={colors.bar}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── BOTTOM FOOTER: 4 SUMMARY SUB-METRICS CHIPS ───────────────── */}
        <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Peak */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <ArrowUpRight size={13} className="text-emerald-500" />
              <span>{lang === 'kk' ? 'Ең жоғары мән' : 'Пик'}</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                {metrics.peak}
              </span>
              <span className="text-[10px] text-zinc-400">/ {lang === 'kk' ? 'күн' : 'день'}</span>
            </div>
          </div>

          {/* Low */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <ArrowDownRight size={13} className="text-amber-500" />
              <span>{lang === 'kk' ? 'Ең төмен мән' : 'Минимум'}</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                {metrics.low}
              </span>
              <span className="text-[10px] text-zinc-400">/ {lang === 'kk' ? 'күн' : 'день'}</span>
            </div>
          </div>

          {/* Average */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Sparkles size={13} className={colors.accentText} />
              <span>{lang === 'kk' ? 'Орташа мән' : 'Среднее'}</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                {metrics.avg}
              </span>
              <span className="text-[10px] text-zinc-400">/ {lang === 'kk' ? 'күн' : 'день'}</span>
            </div>
          </div>

          {/* Today Growth / Activity */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Activity size={13} className="text-blue-500" />
              <span>{lang === 'kk' ? 'Бүгін' : 'Сегодня'}</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                {metrics.today}
              </span>
              <span
                className={cn(
                  'text-[10px] font-extrabold px-1.5 py-0.2 rounded-md',
                  metrics.todayDelta >= 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                )}
              >
                {metrics.todayDelta >= 0 ? `+${metrics.todayDelta}` : metrics.todayDelta}{' '}
                {lang === 'kk' ? 'бүгін' : 'сегодня'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsMetricCard;
