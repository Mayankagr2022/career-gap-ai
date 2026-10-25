'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Ban, ChevronLeft, ChevronRight, CheckCircle, Download, Search, Shield, ShieldAlert } from 'lucide-react';
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus, type AdminUser } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth.store';
import { Panel, PanelEmpty, Segmented } from '@/components/admin/admin-ui';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
type SortKey = 'name' | 'role' | 'resumes' | 'analyses' | 'createdAt';
type RoleFilter = 'ALL' | 'ADMIN' | 'USER';
type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED';

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        role === 'ADMIN' ? 'border-accent/60 text-accent' : 'border-white/15 text-muted-foreground'
      )}
    >
      {role === 'ADMIN' ? 'Admin' : 'User'}
    </span>
  );
}

function StatusLabel({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <i className={cn('h-2 w-2 rounded-full', active ? 'bg-emerald-400' : 'bg-rose-500')} />
      <span className={active ? 'text-foreground' : 'text-rose-400'}>{active ? 'Active' : 'Suspended'}</span>
    </span>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.09] bg-card/80 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={cn('font-mono text-xl font-semibold tabular-nums', tone)}>{value}</div>
    </div>
  );
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: AdminUser[]) {
  const head = ['name', 'email', 'role', 'status', 'resumes', 'analyses', 'joined'];
  const lines = rows.map((u) =>
    [u.name, u.email, u.role, u.isActive ? 'active' : 'suspended', u._count.resumes, u._count.analyses, u.createdAt]
      .map(csvCell)
      .join(',')
  );
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminUsersPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const { user: currentUser } = useAuthStore();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateUserRole();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const all = users ?? [];
    return {
      total: all.length,
      admins: all.filter((u) => u.role === 'ADMIN').length,
      active: all.filter((u) => u.isActive).length,
      suspended: all.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (users ?? []).filter(
      (u) =>
        (role === 'ALL' || u.role === role) &&
        (status === 'ALL' || (status === 'ACTIVE') === u.isActive) &&
        (!q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
    const val = (u: AdminUser): string | number =>
      sort.key === 'name' ? (u.name ?? '').toLowerCase()
      : sort.key === 'role' ? u.role
      : sort.key === 'resumes' ? u._count.resumes
      : sort.key === 'analyses' ? u._count.analyses
      : new Date(u.createdAt).getTime();
    const m = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * m;
    });
  }, [users, search, role, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);
  const from = filtered.length ? cur * PAGE_SIZE + 1 : 0;
  const to = Math.min(filtered.length, (cur + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'role' ? 'asc' : 'desc' }));
    setPage(0);
  };

  const SortTh = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn('px-4 py-2.5 font-medium', className)} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground', sort.key === k && 'text-primary')}>
        {label}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  const roleAction = (u: AdminUser) => updateRole({ id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' });
  const statusAction = (u: AdminUser) => updateStatus({ id: u.id, isActive: !u.isActive });

  const header = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">// users</p>
        <p className="text-sm text-muted-foreground">Manage roles and access for every account.</p>
      </div>
      <button type="button" onClick={() => exportCsv(filtered)} disabled={!filtered.length} className="btn-secondary inline-flex min-h-[40px] items-center gap-2 px-3 py-2 text-xs disabled:opacity-50">
        <Download className="h-4 w-4" /> Export CSV
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-w-0">
        {header}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[62px] animate-pulse rounded-md border border-white/[0.09] bg-white/[0.04]" />)}
        </div>
        <div className="h-72 animate-pulse rounded-lg border border-white/[0.09] bg-white/[0.04]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-w-0">
        {header}
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          Failed to load users. Are you sure you are an admin?
        </div>
      </div>
    );
  }

  const ActionButtons = ({ u, big }: { u: AdminUser; big?: boolean }) => {
    const isMe = currentUser?.id === u.id;
    const base = cn(
      'flex items-center justify-center gap-2 rounded-md border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      big ? 'min-h-[44px] flex-1' : 'h-9 w-9'
    );
    return (
      <>
        <button
          onClick={() => roleAction(u)}
          disabled={isMe || isUpdatingRole}
          title={u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
          className={cn(base, u.role === 'ADMIN' ? 'border-accent/40 text-accent hover:bg-accent/10' : 'border-primary/40 text-primary hover:bg-primary/10')}
        >
          {u.role === 'ADMIN' ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          {big && (u.role === 'ADMIN' ? 'Demote' : 'Promote')}
        </button>
        <button
          onClick={() => statusAction(u)}
          disabled={isMe || isUpdatingStatus}
          title={u.isActive ? 'Suspend Account' : 'Activate Account'}
          className={cn(base, u.isActive ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10' : 'border-primary/40 text-primary hover:bg-primary/10')}
        >
          {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          {big && (u.isActive ? 'Suspend' : 'Activate')}
        </button>
      </>
    );
  };

  return (
    <div className="min-w-0">
      {header}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chip label="Total" value={counts.total} />
        <Chip label="Admins" value={counts.admins} tone="text-accent" />
        <Chip label="Active" value={counts.active} tone="text-primary" />
        <Chip label="Suspended" value={counts.suspended} tone={counts.suspended ? 'text-rose-400' : undefined} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name or email"
            className="input-field min-h-[40px] w-full pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Segmented<RoleFilter> value={role} onChange={(v) => { setRole(v); setPage(0); }} options={[{ value: 'ALL', label: 'All roles' }, { value: 'ADMIN', label: 'Admin' }, { value: 'USER', label: 'User' }]} />
          <Segmented<StatusFilter> value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: 'ALL', label: 'Any' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
        </div>
      </div>

      <Panel bodyClassName="p-0 sm:p-0">
        {filtered.length === 0 ? (
          <div className="p-6"><PanelEmpty text="No users match these filters" /></div>
        ) : (
          <>
            {/* Phones: stacked cards */}
            <ul className="divide-y divide-white/[0.07] md:hidden">
              {slice.map((u) => (
                <li key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <StatusLabel active={u.isActive} />
                    <span>{format(new Date(u.createdAt), 'yyyy-MM-dd')}</span>
                    <span className="tabular-nums">{u._count.resumes} res</span>
                    <span className="tabular-nums">{u._count.analyses} ana</span>
                  </div>
                  <div className="mt-3 flex gap-2"><ActionButtons u={u} big /></div>
                </li>
              ))}
            </ul>

            {/* md+: table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 border-b border-white/[0.09] bg-card font-mono text-[10px] text-muted-foreground">
                  <tr>
                    <SortTh k="name" label="User" className="w-[34%]" />
                    <SortTh k="role" label="Role" />
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wider">Status</th>
                    <SortTh k="resumes" label="Resumes" className="text-right" />
                    <SortTh k="analyses" label="Analyses" className="text-right" />
                    <SortTh k="createdAt" label="Joined" />
                    <th className="w-24 px-4 py-2.5 text-right font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {slice.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5">
                        <div className="truncate font-medium">{u.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-2.5"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-2.5"><StatusLabel active={u.isActive} /></td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{u._count.resumes}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{u._count.analyses}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{format(new Date(u.createdAt), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-2.5"><div className="flex justify-end gap-1.5"><ActionButtons u={u} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-2.5">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{from}–{to} of {filtered.length}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage(cur - 1)} disabled={cur === 0} aria-label="Previous page" className="btn-secondary flex h-10 w-10 items-center justify-center p-0 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setPage(cur + 1)} disabled={cur >= pages - 1} aria-label="Next page" className="btn-secondary flex h-10 w-10 items-center justify-center p-0 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
