'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Panel } from '@/components/admin/admin-ui';
import { getApiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/** Inert on purpose: nothing here is wired to the backend. */
function FakeSwitch({ on }: { on: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-md border px-[3px] opacity-60',
        on ? 'justify-end border-primary/50 bg-primary/30' : 'justify-start border-white/15 bg-white/[0.06]'
      )}
    >
      <div className={cn('h-4 w-4 rounded-sm', on ? 'bg-primary' : 'bg-zinc-400')} />
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <h4 className="text-sm font-medium">{label}</h4>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

const Readout = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 rounded border border-white/10 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{children}</span>
);

function browserName(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

function Environment() {
  const [now, setNow] = useState<Date | null>(null);
  const [env, setEnv] = useState({ origin: '', browser: '', tz: '' });

  useEffect(() => {
    setEnv({
      origin: window.location.origin,
      browser: browserName(navigator.userAgent),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows: [string, string][] = [
    ['API base URL', getApiUrl()],
    ['App origin', env.origin || '–'],
    ['Browser', env.browser || '–'],
    ['Time zone', env.tz || '–'],
    ['Local time', now ? format(now, 'yyyy-MM-dd HH:mm:ss') : '–'],
  ];
  return (
    <Panel title="Environment" subtitle="Read-only, derived in this browser">
      <dl className="divide-y divide-white/[0.06]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-all font-mono text-xs tabular-nums sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="min-w-0">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{'//'} settings</p>
        <p className="text-sm text-muted-foreground">
          Informational only. These controls are not connected to the backend yet and do not change anything.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="General" subtitle="Not yet functional">
          <Row label="Maintenance mode" desc="Temporarily disable access for non-admin users."><FakeSwitch on={false} /></Row>
          <Row label="New user registration" desc="Allow new users to sign up."><FakeSwitch on /></Row>
        </Panel>

        <Panel title="Security" subtitle="Not yet functional">
          <Row label="Require email verification" desc="Block sign-in until the email is confirmed."><FakeSwitch on={false} /></Row>
          <Row label="Admin access" desc="Roles are managed per user on the Users tab."><Readout>Users tab</Readout></Row>
        </Panel>

        <Panel title="AI & limits" subtitle="Not yet functional">
          <Row label="Gemini API key" desc="Used for resume parsing and gap analysis.">
            <button disabled className="btn-secondary min-h-[40px] shrink-0 cursor-not-allowed px-4 py-1.5 text-xs opacity-50">Configure</button>
          </Row>
          <Row label="Per-user analysis limit" desc="Cap analyses per user per day."><Readout>Not set</Readout></Row>
        </Panel>

        <Panel title="Maintenance" subtitle="Not yet functional">
          <Row label="Purge old audit entries" desc="Delete audit events past the retention window.">
            <button disabled className="btn-secondary min-h-[40px] shrink-0 cursor-not-allowed px-4 py-1.5 text-xs opacity-50">Run</button>
          </Row>
          <Row label="Clear cached analytics" desc="Force dashboards to recompute."><FakeSwitch on={false} /></Row>
        </Panel>

        <div className="lg:col-span-2"><Environment /></div>
      </div>
    </div>
  );
}
