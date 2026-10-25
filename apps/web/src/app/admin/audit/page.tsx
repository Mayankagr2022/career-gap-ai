'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAdminAudit, type AuditEntry } from '@/hooks/use-admin-analytics';
import { Panel, PanelEmpty } from '@/components/admin/admin-ui';
import { cn } from '@/lib/utils';

const LIMIT = 25;

function actionTone(a: string) {
  const l = a.toLowerCase();
  if (/(error|fail|denied|reject|invalid)/.test(l)) return 'border-rose-500/40 text-rose-400';
  if (l.startsWith('auth.')) return 'border-cyan-400/40 text-cyan-300';
  if (l.startsWith('admin.')) return 'border-accent/50 text-accent';
  return 'border-primary/40 text-primary';
}

function ActionPill({ action }: { action: string }) {
  return (
    <span className={cn('inline-block max-w-full truncate rounded border px-1.5 py-0.5 font-mono text-[11px]', actionTone(action))}>
      {action}
    </span>
  );
}

const when = (iso: string) => format(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });
const shortId = (id: string | null) => (id ? id.slice(0, 8) : '');

function Chips({ actions, value, onChange }: { actions: { name: string; value: number }[]; value: string; onChange: (v: string) => void }) {
  const chip = (active: boolean) =>
    cn(
      'min-h-[36px] shrink-0 rounded-md border px-2.5 font-mono text-[11px] transition-colors',
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:text-foreground'
    );
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" className={chip(value === '')} onClick={() => onChange('')}>All</button>
      {actions.map((a) => (
        <button key={a.name} type="button" className={chip(value === a.name)} onClick={() => onChange(a.name)}>
          {a.name} <span className="tabular-nums opacity-70">{a.value}</span>
        </button>
      ))}
    </div>
  );
}

function Entity({ e }: { e: AuditEntry }) {
  if (!e.entity) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="font-mono text-xs">
      {e.entity}
      {e.entityId && <span className="text-muted-foreground"> #{shortId(e.entityId)}</span>}
    </span>
  );
}

export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const { data, isLoading, error, refetch, isFetching } = useAdminAudit({ limit: LIMIT, skip: page * LIMIT, action });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const from = total ? page * LIMIT + 1 : 0;
  const to = Math.min(total, page * LIMIT + items.length);

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{'//'} audit log</p>
          <p className="text-sm text-muted-foreground">Security and administrative events, newest first.</p>
        </div>
        <button type="button" onClick={() => refetch()} className="btn-secondary inline-flex min-h-[40px] items-center gap-2 px-3 py-2 text-xs">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /> Refresh
        </button>
      </div>

      <Chips actions={data?.actions ?? []} value={action} onChange={(v) => { setAction(v); setPage(0); }} />

      {error && !data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>Failed to load the audit log.</span>
          <button type="button" onClick={() => refetch()} className="btn-secondary min-h-[40px] px-3 text-xs">Retry</button>
        </div>
      ) : isLoading ? (
        <div className="h-72 animate-pulse rounded-lg border border-white/[0.09] bg-white/[0.04]" />
      ) : (
        <Panel bodyClassName="p-0 sm:p-0">
          {items.length === 0 ? (
            <div className="p-6"><PanelEmpty text="No audit events" /></div>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.07] md:hidden">
                {items.map((e) => (
                  <li key={e.id} className="space-y-1.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <ActionPill action={e.action} />
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[11px] tabular-nums">{when(e.createdAt)}</div>
                        <div className="text-[10px] text-muted-foreground">{ago(e.createdAt)}</div>
                      </div>
                    </div>
                    <div className="min-w-0 text-xs">
                      <div className="truncate">{e.user?.name ?? 'System'}</div>
                      <div className="truncate text-muted-foreground">{e.user?.email ?? '–'}</div>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-muted-foreground">
                      <Entity e={e} />
                      <span className="font-mono text-xs">{e.ipAddress ?? '–'}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-white/[0.09] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-[19%] px-4 py-2.5 font-medium">Time</th>
                      <th className="w-[22%] px-4 py-2.5 font-medium">Action</th>
                      <th className="w-[27%] px-4 py-2.5 font-medium">Actor</th>
                      <th className="w-[20%] px-4 py-2.5 font-medium">Entity</th>
                      <th className="px-4 py-2.5 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {items.map((e) => (
                      <tr key={e.id} className="align-top transition-colors hover:bg-white/[0.04]">
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs tabular-nums">{when(e.createdAt)}</div>
                          <div className="text-[10px] text-muted-foreground">{ago(e.createdAt)}</div>
                        </td>
                        <td className="px-4 py-2.5"><ActionPill action={e.action} /></td>
                        <td className="px-4 py-2.5">
                          <div className="truncate">{e.user?.name ?? 'System'}</div>
                          <div className="truncate text-xs text-muted-foreground">{e.user?.email ?? '–'}</div>
                        </td>
                        <td className="truncate px-4 py-2.5"><Entity e={e} /></td>
                        <td className="truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">{e.ipAddress ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-2.5">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{from}–{to} of {total}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Previous page" className="btn-secondary flex h-10 w-10 items-center justify-center p-0 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * LIMIT >= total} aria-label="Next page" className="btn-secondary flex h-10 w-10 items-center justify-center p-0 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
