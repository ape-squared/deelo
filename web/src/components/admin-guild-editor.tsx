'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { SearchField } from '@/components/search-field';
import Link from 'next/link';
import { AdminCard, AdminEmpty, AdminStatCard } from '@/components/admin/ui';

interface Guild {
  id: string;
  plan: string;
  prefix: string;
  plan_expires_at: string | null;
}

const PLANS = [
  { id: 'free', label: 'Free', color: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300' },
  { id: 'premium', label: 'Premium', color: 'border-accent/40 bg-accent-soft text-accent' },
  { id: 'premium_plus', label: 'Premium+', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
] as const;

export function GuildPlanEditor({ guilds }: { guilds: Guild[] }) {
  const [list, setList] = useState(guilds);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const stats = useMemo(() => ({
    free: list.filter((g) => g.plan === 'free').length,
    premium: list.filter((g) => g.plan === 'premium').length,
    premium_plus: list.filter((g) => g.plan === 'premium_plus').length,
  }), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((g) => {
      if (planFilter !== 'all' && g.plan !== planFilter) return false;
      if (!q) return true;
      return g.id.includes(q) || g.prefix.toLowerCase().includes(q) || g.plan.includes(q);
    });
  }, [list, search, planFilter]);

  async function updatePlan(guildId: string, plan: string, days?: number) {
    setMsg('');
    setLoading(guildId);
    const res = await fetch('/api/admin/guilds', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, plan, days }),
    });
    setLoading(null);
    if (res.ok) {
      const { guild } = await res.json();
      setList((l) => l.map((g) => (g.id === guildId ? { ...g, ...guild } : g)));
      setMsg(`Updated ${guildId.slice(0, 8)}… — subscription synced`);
      setTimeout(() => setMsg(''), 4000);
    } else {
      setMsg('Update failed');
    }
  }

  function planColor(plan: string) {
    return PLANS.find((p) => p.id === plan)?.color ?? 'badge-muted';
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Free guilds" value={stats.free} icon="server" />
        <AdminStatCard label="Premium" value={stats.premium} icon="crown" />
        <AdminStatCard label="Premium+" value={stats.premium_plus} icon="crown" trend="plus" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="flex-1 min-w-[200px] max-w-md"
          fieldSize="sm"
          placeholder="Search guild ID or prefix..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-background/50 p-1">
          {['all', ...PLANS.map((p) => p.id)].map((p) => (
            <button key={p} type="button" onClick={() => setPlanFilter(p)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${planFilter === p ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}>
              {p === 'all' ? 'All' : p.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">{filtered.length} shown</span>
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm animate-fade-in ${msg.includes('failed') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {msg}
        </div>
      )}

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background/50 text-left text-muted">
              <tr>
                <th className="p-4 font-medium">Guild</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Prefix</th>
                <th className="p-4 font-medium">Expires</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-border/50 transition hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{g.id}</span>
                      <Link href={`/dashboard/${g.id}`} className="text-muted hover:text-accent">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`badge capitalize ${planColor(g.plan)}`}>{g.plan.replace('_', ' ')}</span>
                  </td>
                  <td className="p-4 font-mono">{g.prefix}</td>
                  <td className="p-4 text-muted text-xs">
                    {g.plan_expires_at ? new Date(g.plan_expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {PLANS.map(({ id, label, color }) => (
                        <button
                          key={id}
                          type="button"
                          disabled={loading === g.id}
                          onClick={() => updatePlan(g.id, id, id === 'free' ? undefined : 30)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:scale-105 disabled:opacity-50 ${g.plan === id ? color : 'border-border hover:border-accent/40'}`}
                        >
                          {loading === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : g.plan === id ? <Check className="h-3 w-3" /> : label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <AdminEmpty message="No guilds match your search." />}
      </AdminCard>
    </div>
  );
}
