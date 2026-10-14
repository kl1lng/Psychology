"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/area-chart";
import React from "react";

export interface ClassRiskDataPoint {
  name: string;
  norm: number;
  medium: number;
  high: number;
  critical: number;
}

const defaultChartData: ClassRiskDataPoint[] = [
  { name: "8А", norm: 18, medium: 5, high: 3, critical: 1 },
  { name: "8Б", norm: 16, medium: 6, high: 4, critical: 2 },
  { name: "9А", norm: 14, medium: 7, high: 5, critical: 2 },
  { name: "9Б", norm: 12, medium: 8, high: 6, critical: 3 },
  { name: "10А", norm: 20, medium: 4, high: 2, critical: 1 },
  { name: "10Б", norm: 17, medium: 5, high: 3, critical: 1 },
  { name: "11А", norm: 15, medium: 6, high: 4, critical: 2 },
  { name: "11Б", norm: 13, medium: 7, high: 5, critical: 2 },
];

interface BarPatternChartProps {
  data?: ClassRiskDataPoint[];
  title?: string;
  description?: string;
  lang?: 'ru' | 'kk';
}

export default function BarPatternChart({
  data,
  title,
  description,
  lang = 'ru',
}: BarPatternChartProps) {
  const chartData = data && data.length > 0 ? data : defaultChartData;

  const resolvedTitle =
    title ||
    (lang === 'kk'
      ? 'Сыныптардың салыстырмалы психологиялық бейіні'
      : 'Сравнительный психологический профиль классов');

  const resolvedDescription =
    description ||
    (lang === 'kk'
      ? 'Параллельдер бойынша дезадаптация қаупінің бөлінуі'
      : 'Распределение рисков дезадаптации по параллелям');

  const chartConfig = useMemo(() => ({
    norm: {
      label: lang === 'kk' ? 'Қалыпты' : 'Норма',
      color: '#10b981',
    },
    medium: {
      label: lang === 'kk' ? 'Орташа қауіп' : 'Средний риск',
      color: '#fbbf24',
    },
    high: {
      label: lang === 'kk' ? 'Жоғары қауіп' : 'Высокий риск',
      color: '#f97316',
    },
    critical: {
      label: lang === 'kk' ? 'Қауіпті (Критикалық)' : 'Критический',
      color: '#f43f5e',
    },
  } satisfies ChartConfig), [lang]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <defs>
              <HatchedBackgroundPattern config={chartConfig} />
            </defs>
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="norm"
              type="natural"
              fill="url(#bar-background-pattern-norm)"
              fillOpacity={0.4}
              stroke="var(--color-norm)"
              stackId="a"
              strokeWidth={0.8}
            />
            <Area
              dataKey="medium"
              type="natural"
              fill="url(#bar-background-pattern-medium)"
              fillOpacity={0.4}
              stroke="var(--color-medium)"
              stackId="a"
              strokeWidth={0.8}
            />
            <Area
              dataKey="high"
              type="natural"
              fill="url(#bar-background-pattern-high)"
              fillOpacity={0.4}
              stroke="var(--color-high)"
              stackId="a"
              strokeWidth={0.8}
            />
            <Area
              dataKey="critical"
              type="natural"
              fill="url(#bar-background-pattern-critical)"
              fillOpacity={0.4}
              stroke="var(--color-critical)"
              stackId="a"
              strokeWidth={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const HatchedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <g key={key}>
          <linearGradient
            id={`bar-pattern-gradient-${key}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="50%" stopColor={value} stopOpacity={0.2} />
            <stop offset="50%" stopColor={value} />
          </linearGradient>
          <pattern
            id={`bar-background-pattern-${key}`}
            x="0"
            y="0"
            width="40"
            height="10"
            patternUnits="userSpaceOnUse"
            overflow="visible"
          >
            <rect
              width="40"
              height="10"
              fill={`url(#bar-pattern-gradient-${key})`}
            />
          </pattern>
        </g>
      ))}
    </>
  );
};
