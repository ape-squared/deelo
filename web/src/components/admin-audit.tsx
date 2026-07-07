'use client';

import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { AdminCard, AdminEmpty, AdminStatCard } from '@/components/admin/ui';

interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  admin_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  'subscription.create': 'text-green-400',
  'subscription.cancel': 'text-red-400',
  'subscription.extend': 'text-accent',
  'guild.plan_update': 'text-amber-400',
};

export function AdminAuditLog({ logs }: { logs: AuditEntry[] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (!q) return true;
      return l.action.includes(q) || l.target_id?.includes(q) || l.target_type?.includes(q);
    });
  }, [logs, search, actionFilter]);

  const today = logs.filter((l) => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total entries" value={logs.length} icon="server" />
        <AdminStatCard label="Today" value={today} icon="clock" variant="success" />
        <AdminStatCard label="Action types" value={actions.length} icon="server" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9 text-sm" placeholder="Search action or target..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-48 text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((l, i) => (
          <div
            key={l.id}
            className="card flex flex-wrap items-start gap-4 p-4 animate-fade-up hover:border-accent/20 transition"
            style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ScrollText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`font-medium font-mono text-sm ${ACTION_COLORS[l.action] ?? ''}`}>{l.action}</span>
                {l.target_type && (
                  <span className="badge badge-muted text-[10px]">
                    {l.target_type}{l.target_id ? `: ${l.target_id}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {new Date(l.created_at).toLocaleString()}
                {l.admin_id && <> · Admin <span className="font-mono">{l.admin_id.slice(0, 8)}…</span></>}
              </p>
              {l.metadata && Object.keys(l.metadata).length > 0 && (
                <pre className="mt-2 text-[10px] text-muted bg-white/5 rounded-lg p-2 overflow-x-auto font-mono">
                  {JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
        {!filtered.length && <AdminEmpty message="No audit entries match your filters." />}
      </div>
    </div>
  );
}
