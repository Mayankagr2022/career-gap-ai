'use client';

import { useId } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ADMIN_AXIS, ADMIN_GRID, ADMIN_SERIES, ChartTooltip, PanelEmpty, compact, shortDay } from './admin-ui';

export interface Series {
  key: string;
  label: string;
  color?: string;
}

/** Multi-series time chart. `kind` picks area (default), line or stacked/grouped bars. */
export function TrendChart({
  data,
  series,
  kind = 'area',
  height = 260,
  stacked = false,
  valueFormatter,
}: {
  data: Record<string, any>[];
  series: Series[];
  kind?: 'area' | 'line' | 'bar';
  height?: number;
  stacked?: boolean;
  valueFormatter?: (v: number) => string;
}) {
  const uid = useId().replace(/:/g, '');
  if (!data.length) return <PanelEmpty />;

  const colorOf = (s: Series, i: number) => s.color ?? ADMIN_SERIES[i % ADMIN_SERIES.length];
  // Recharts only discovers direct children (or arrays of them), not a React fragment, so these are returned as an array
  const axes = [
    <CartesianGrid key="grid" stroke={ADMIN_GRID} strokeDasharray="2 4" vertical={false} />,
    <XAxis key="x" dataKey="day" tickFormatter={shortDay} tick={ADMIN_AXIS} tickLine={false} axisLine={{ stroke: ADMIN_GRID }} minTickGap={28} />,
    <YAxis key="y" tick={ADMIN_AXIS} tickLine={false} axisLine={false} width={38} allowDecimals={false} tickFormatter={(v) => compact(v)} />,
    <Tooltip
      key="tip"
      cursor={{ stroke: 'hsl(152 76% 46% / 0.4)', strokeDasharray: '3 3' }}
      content={<ChartTooltip labelFormatter={shortDay} valueFormatter={valueFormatter ? (v) => valueFormatter(v) : undefined} />}
    />,
    <Legend key="legend" iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'hsl(160 9% 70%)', paddingTop: 6 }} />,
  ];
  const margin = { top: 6, right: 8, bottom: 0, left: 0 };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={data} margin={margin} barCategoryGap="22%">
            {axes}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorOf(s, i)} stackId={stacked ? 'a' : undefined} radius={stacked ? 0 : [2, 2, 0, 0]} maxBarSize={22} />
            ))}
          </BarChart>
        ) : kind === 'line' ? (
          <LineChart data={data} margin={margin}>
            {axes}
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s, i)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={margin}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s, i)} strokeWidth={2} fill={`url(#${uid}-${s.key})`} stackId={stacked ? 'a' : undefined} />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Ring chart with a total in the middle and a legend underneath. */
export function DonutChart({
  data,
  colors = ADMIN_SERIES,
  centerLabel = 'total',
  height = 180,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
  centerLabel?: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <PanelEmpty />;
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums">{compact(total)}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.name} className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span className="truncate capitalize">{d.name.toLowerCase()}</span>
            </span>
            <span className="font-mono tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three-quarter ring gauge for a 0-100 value. */
export function Gauge({
  value,
  label,
  color = ADMIN_SERIES[0],
  suffix = '',
  max = 100,
}: {
  value: number | null | undefined;
  label: string;
  color?: string;
  suffix?: string;
  max?: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const ratio = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full rotate-[135deg]">
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(165 12% 100% / 0.08)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${arc * ratio} ${c}`}
            style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xl font-semibold tabular-nums">{value == null ? '–' : `${Math.round(value)}${suffix}`}</span>
        </div>
      </div>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/** Ranked horizontal bars drawn with plain divs (crisp at any width). */
export function BarList({
  data,
  color = ADMIN_SERIES[0],
  valueFormatter = (v: number) => String(v),
  empty,
}: {
  data: { name: string; value: number }[];
  color?: string;
  valueFormatter?: (v: number) => string;
  empty?: string;
}) {
  if (!data.length) return <PanelEmpty text={empty} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => (
        <li key={d.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{valueFormatter(d.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
            <div className="h-full rounded-sm transition-[width] duration-700" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical histogram (score distribution). */
export function Histogram({ data, color = ADMIN_SERIES[2], height = 200 }: { data: { range: string; count: number }[]; color?: string; height?: number }) {
  if (!data.some((d) => d.count > 0)) return <PanelEmpty text="No completed analyses yet" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="14%">
          <CartesianGrid stroke={ADMIN_GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="range" tick={ADMIN_AXIS} tickLine={false} axisLine={{ stroke: ADMIN_GRID }} interval={0} />
          <YAxis tick={ADMIN_AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'hsl(165 12% 100% / 0.05)' }} content={<ChartTooltip valueFormatter={(v) => `${v} analyses`} />} />
          <Bar dataKey="count" name="Analyses" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => <Cell key={d.range} fill={i >= 7 ? ADMIN_SERIES[0] : i >= 4 ? color : ADMIN_SERIES[1]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday x hour activity grid. Brighter cell = more events. */
export function Heatmap({ cells }: { cells: { day: number; hour: number; count: number }[] }) {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let max = 0;
  for (const c of cells) {
    grid[c.day][c.hour] = c.count;
    if (c.count > max) max = c.count;
  }
  if (!max) return <PanelEmpty text="No activity recorded yet" />;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[34rem]">
        {grid.map((row, d) => (
          <div key={DAYS[d]} className="mb-1 flex items-center gap-1">
            <span className="w-8 shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{DAYS[d]}</span>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
              {row.map((count, h) => (
                <i
                  key={h}
                  title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 - ${count} events`}
                  className={cn('aspect-square rounded-[3px]', count === 0 && 'bg-white/[0.04]')}
                  style={count ? { background: `rgba(52, 211, 153, ${0.18 + (count / max) * 0.82})` } : undefined}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1 pl-9 font-mono text-[10px] text-muted-foreground">
          {[0, 6, 12, 18, 23].map((h) => (
            <span key={h} style={{ marginLeft: h === 0 ? 0 : 'auto' }}>{String(h).padStart(2, '0')}h</span>
          ))}
        </div>
      </div>
    </div>
  );
}
