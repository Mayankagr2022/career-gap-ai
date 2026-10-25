'use client';

import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Chart palette for the admin console: emerald first, then amber, cyan, rose, sky, lime. */
export const ADMIN_SERIES = ['#34d399', '#fbbf24', '#22d3ee', '#fb7185', '#60a5fa', '#a3e635'];
export const ADMIN_GRID = 'hsl(165 12% 100% / 0.07)';
export const ADMIN_AXIS = { fill: 'hsl(160 9% 60%)', fontSize: 11 };

export const compact = (n: number | null | undefined) =>
  n == null ? '–' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const pct = (n: number | null | undefined, digits = 0) =>
  n == null ? '–' : `${(n * 100).toFixed(digits)}%`;

/** "2026-10-25" -> "Oct 25". Parsed by hand so the browser's time zone cannot shift the day. */
export function shortDay(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`;
}

/** A bordered section with a mono caption header. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('relative min-w-0 rounded-lg border border-white/[0.09] bg-card/80', className)}>
      {/* Corner ticks give the panels an instrument-panel feel */}
      <i className="pointer-events-none absolute -left-px -top-px h-2.5 w-2.5 rounded-tl-lg border-l-2 border-t-2 border-primary/70" />
      <i className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 rounded-br-lg border-b-2 border-r-2 border-primary/70" />
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function DeltaBadge({ current, previous, className }: { current: number; previous: number; className?: string }) {
  if (previous === 0 && current === 0) {
    return <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground', className)}><Minus className="h-3 w-3" />0%</span>;
  }
  if (previous === 0) {
    return <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11px] text-primary', className)}><ArrowUpRight className="h-3 w-3" />new</span>;
  }
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11px]', up ? 'text-primary' : 'text-rose-400', className)}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

/** Metric tile: label, big mono number, optional delta and sparkline. */
export function Kpi({
  label,
  value,
  icon: Icon,
  color = ADMIN_SERIES[0],
  delta,
  spark,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  delta?: { current: number; previous: number };
  spark?: { v: number }[];
  hint?: string;
}) {
  const gid = useId().replace(/:/g, '');
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-lg border border-white/[0.09] bg-card/80 p-4 transition-colors hover:border-white/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}1f`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-2xl font-semibold tabular-nums sm:text-[1.75rem]">{value}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            {delta && <DeltaBadge current={delta.current} previous={delta.previous} />}
            {hint && <span className="truncate">{hint}</span>}
          </div>
        </div>
        {spark && spark.length > 1 && (
          <div className="hidden h-10 w-20 shrink-0 min-[480px]:block sm:w-24" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gid})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/** Dark tooltip shared by every chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelFormatter?: (l: string) => string;
  valueFormatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-white/15 bg-popover/95 px-3 py-2 text-xs shadow-xl">
      {label != null && <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{labelFormatter ? labelFormatter(String(label)) : label}</div>}
      <div className="space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <i className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
              {p.name ?? p.dataKey}
            </span>
            <span className="font-mono font-semibold tabular-nums">{valueFormatter ? valueFormatter(p.value, p.name) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelEmpty({ text = 'No data in this period yet' }: { text?: string }) {
  return (
    <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 text-center">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => <i key={i} className="w-1.5 rounded-sm bg-white/10" style={{ height: `${10 + i * 6}px` }} />)}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{text}</p>
    </div>
  );
}

/** Square-cornered segmented control (used for the 7/30/90 day range). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-white/10 bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors',
            o.value === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusDot({ state }: { state: 'ok' | 'warn' | 'down' | 'idle' }) {
  const color = state === 'ok' ? 'bg-emerald-400' : state === 'warn' ? 'bg-amber-400' : state === 'down' ? 'bg-rose-500' : 'bg-zinc-500';
  return (
    <span className="relative inline-flex h-2 w-2">
      {state === 'ok' && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', color)} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
    </span>
  );
}
