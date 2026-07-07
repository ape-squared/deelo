'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus, Ban, Loader2, Clock, History, ExternalLink, RefreshCw } from 'lucide-react';
import { SearchField } from '@/components/search-field';
import { AdminCard, AdminEmpty, AdminStatCard, AdminTable, formatRelative } from '@/components/admin/ui';
import type { SubscriptionRow, SubscriptionView } from '@/lib/admin-subscriptions';
import { groupSubscriptionsByGuild, subscriptionStats } from '@/lib/admin-subscriptions';

const STATUS_STYLES: Record<string, string> = {
  active: 'badge-success',
  cancelled: 'badge-muted',
  expired: 'border-red-500/30 bg-red-500/10 text-red-400',
  trialing: 'badge-warning',
  past_due: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
};

type Filter = 'all' | 'active' | 'cancelled' | 'expiring';

export function SubscriptionManager({
  initial,
  guildPlans,
  duplicateCount: initialDupes,
}: {
  initial: SubscriptionRow[];
  guildPlans: Record<string, string>;
  duplicateCount: number;
}) {
  const [allSubs, setAllSubs] = useState(initial);
  const [guildId, setGuildId] = useState('');
  const [plan, setPlan] = useState('premium');
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [extending, setExtending] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [nowMs] = useState(() => Date.now());

  const planMap = useMemo(() => new Map(Object.entries(guildPlans)), [guildPlans]);
  const { current, duplicateCount } = useMemo(
    () => groupSubscriptionsByGuild(allSubs, planMap),
    [allSubs, planMap],
  );
  const stats = useMemo(() => subscriptionStats(allSubs), [allSubs]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const week = nowMs + 7 * 86400000;
    return current.filter((s) => {
      if (q && !s.guild_id.includes(q) && !s.plan.includes(q) && !String(s.id).includes(q)) return false;
      if (filter === 'active') return s.status === 'active';
      if (filter === 'cancelled') return s.status === 'cancelled';
      if (filter === 'expiring') {
        if (s.status !== 'active' || !s.expires_at) return false;
        const exp = new Date(s.expires_at).getTime();
        return exp > nowMs && exp < week;
      }
      return true;
    });
  }, [current, filter, search, nowMs]);

  const historyFor = (guildId: string) =>
    allSubs.filter((s) => s.guild_id === guildId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function refresh() {
    const res = await fetch('/api/admin/subscriptions');
    if (res.ok) {
      const data = await res.json();
      setAllSubs(data.subscriptions ?? []);
    }
  }

  async function create() {
    if (!guildId.trim()) return;
    setCreating(true);
    setMessage('');
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: guildId.trim(), plan, days, notes: notes || undefined }),
    });
    setCreating(false);
    if (res.ok) {
      await refresh();
      setGuildId('');
      setNotes('');
      setMessage('Subscription created — previous active subs for this guild were replaced.');
      setTimeout(() => setMessage(''), 5000);
    } else {
      setMessage((await res.json()).error ?? 'Failed to create');
    }
  }

  async function cancel(id: number) {
    setCancelling(id);
    const res = await fetch('/api/admin/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    });
    setCancelling(null);
    if (res.ok) await refresh();
  }

  async function extend(id: number, extraDays: number) {
    setExtending(id);
    const res = await fetch('/api/admin/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, days: extraDays }),
    });
    setExtending(null);
    if (res.ok) await refresh();
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm animate-fade-in ${message.includes('Failed') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {message}
        </div>
      )}

      {duplicateCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-3">
          <History className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Duplicate subscriptions detected</p>
            <p className="text-amber-200/80 mt-0.5">Showing one row per guild. {duplicateCount} older record{duplicateCount !== 1 ? 's' : ''} hidden — expand a row to view history. New grants auto-replace active subs.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Active (unique guilds)" value={stats.active} icon="credit-card" variant="success" />
        <AdminStatCard label="Premium plans" value={stats.byPlan.premium} icon="crown" />
        <AdminStatCard label="Premium+ plans" value={stats.byPlan.premium_plus} icon="crown" trend="plus" />
        <AdminStatCard label="Expiring in 7 days" value={stats.expiringSoon} icon="clock" variant={stats.expiringSoon ? 'warning' : 'default'} />
      </div>

      <AdminCard title="Grant subscription" desc="Replaces any existing active subscription for the guild.">
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="sm:col-span-2">
              <label className="label">Guild ID</label>
              <input className="input font-mono text-sm" value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="123456789012345678" />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="premium">Premium</option>
                <option value="premium_plus">Premium+</option>
              </select>
            </div>
            <div>
              <label className="label">Days</label>
              <input type="number" min={1} className="input" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10) || 30)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="label">Notes (optional)</label>
              <input className="input text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Manual grant, promo, etc." />
            </div>
            <button type="button" onClick={create} className="btn-primary text-sm" disabled={creating || !guildId.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Grant access
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <SearchField
            className="flex-1 min-w-[200px] max-w-sm"
            fieldSize="sm"
            inputClassName="text-sm"
            placeholder="Search guild ID or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background/50 p-1">
            {(['all', 'active', 'expiring', 'cancelled'] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${filter === f ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>
          <button type="button" onClick={refresh} className="btn-ghost text-xs py-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="text-xs text-muted ml-auto">{filtered.length} guild{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <AdminTable>
          <thead className="border-b border-border bg-background/50 text-left text-muted">
            <tr>
              <th className="p-4 font-medium">Guild</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Expires</th>
              <th className="p-4 font-medium">Created</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <SubscriptionRowView
                key={`${s.guild_id}-${s.id}`}
                sub={s}
                expanded={expanded === s.guild_id}
                onToggle={() => setExpanded(expanded === s.guild_id ? null : s.guild_id)}
                history={historyFor(s.guild_id)}
                cancelling={cancelling}
                extending={extending}
                onCancel={cancel}
                onExtend={extend}
              />
            ))}
          </tbody>
        </AdminTable>
        {!filtered.length && <AdminEmpty message="No subscriptions match your filters." />}
      </AdminCard>
    </div>
  );
}

function SubscriptionRowView({
  sub,
  expanded,
  onToggle,
  history,
  cancelling,
  extending,
  onCancel,
  onExtend,
}: {
  sub: SubscriptionView;
  expanded: boolean;
  onToggle: () => void;
  history: SubscriptionRow[];
  cancelling: number | null;
  extending: number | null;
  onCancel: (id: number) => void;
  onExtend: (id: number, days: number) => void;
}) {
  const planMismatch = sub.guildPlan && sub.guildPlan !== sub.plan && sub.status === 'active';

  return (
    <>
      <tr className="border-b border-border/50 transition hover:bg-white/[0.02]">
        <td className="p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggle} className="font-mono text-xs hover:text-accent transition" title="View history">
              {sub.guild_id}
            </button>
            {sub.historyCount > 0 && (
              <span className="badge badge-muted text-[10px]">+{sub.historyCount} history</span>
            )}
            <Link href={`/dashboard/${sub.guild_id}`} className="text-muted hover:text-accent" title="Open dashboard">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          {planMismatch && (
            <p className="text-[10px] text-amber-400 mt-1">Guild plan: {sub.guildPlan} (mismatch)</p>
          )}
        </td>
        <td className="p-4 capitalize">{sub.plan.replace('_', ' ')}</td>
        <td className="p-4">
          <span className={`badge capitalize ${STATUS_STYLES[sub.status] ?? 'badge-muted'}`}>{sub.status}</span>
        </td>
        <td className="p-4 text-xs">
          <div>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—'}</div>
          <div className="text-muted">{formatRelative(sub.expires_at)}</div>
        </td>
        <td className="p-4 text-xs text-muted">{new Date(sub.created_at).toLocaleDateString()}</td>
        <td className="p-4">
          <div className="flex flex-wrap gap-2">
            {sub.status === 'active' && (
              <>
                <button type="button" onClick={() => onExtend(sub.id, 30)} disabled={extending === sub.id} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  {extending === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                  +30d
                </button>
                <button type="button" onClick={() => onCancel(sub.id)} disabled={cancelling === sub.id} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  {cancelling === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                  Cancel
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && history.length > 1 && (
        <tr className="bg-white/[0.02]">
          <td colSpan={6} className="px-4 pb-4">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted">Subscription history</p>
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted">
                  <span>#{h.id}</span>
                  <span className="capitalize">{h.plan.replace('_', ' ')}</span>
                  <span className={`badge capitalize text-[10px] ${STATUS_STYLES[h.status] ?? ''}`}>{h.status}</span>
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                  {h.notes && <span className="text-foreground/70 truncate max-w-xs">{h.notes}</span>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
