'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Crown } from 'lucide-react';
import { SearchField } from '@/components/search-field';
import { AdminPageHeader, AdminCard } from '@/components/admin/ui';

type GuildResult = {
  id: string;
  plan: string;
  prefix: string;
  plan_expires_at: string | null;
};

type SubscriptionResult = {
  id: number;
  plan: string;
  status: string;
  expires_at: string | null;
};

export function AdminGuildLookup() {
  const [q, setQ] = useState('');
  const [guild, setGuild] = useState<GuildResult | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResult | null>(null);
  const [list, setList] = useState<GuildResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGuild(null);
    setSubscription(null);
    const res = await fetch(`/api/admin/guild-lookup?q=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Lookup failed');
      return;
    }
    if (data.guild) {
      setGuild(data.guild);
      setSubscription(data.subscription ?? null);
      setList([]);
    } else {
      setList(data.guilds ?? []);
    }
  }

  return (
    <div>
      <AdminPageHeader
        badge="Platform"
        title="Server search"
        description="Find any registered guild by snowflake ID, inspect plan tier, prefix, and active subscription."
      />

      {error && (
        <div className="admin-alert admin-alert-danger mb-6">{error}</div>
      )}

      <form onSubmit={search} className="flex flex-col sm:flex-row gap-2 mb-8">
        <SearchField
          className="flex-1"
          fieldSize="sm"
          placeholder="Guild snowflake ID (leave empty for recent servers)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn-primary text-sm py-2.5 shrink-0" disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {guild ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="Guild details">
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-sm break-all">{guild.id}</p>
                <span className="badge badge-accent capitalize shrink-0">{guild.plan.replace('_', ' ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted text-xs">Prefix</p>
                  <p className="font-medium mt-0.5">{guild.prefix}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Plan expires</p>
                  <p className="font-medium mt-0.5">{guild.plan_expires_at ? new Date(guild.plan_expires_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <Link href={`/dashboard/${guild.id}`} className="btn-secondary text-sm w-full justify-center" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Open server dashboard
              </Link>
            </div>
          </AdminCard>

          <AdminCard title="Active subscription">
            <div className="p-5">
              {subscription ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Plan</dt>
                    <dd className="capitalize font-medium">{subscription.plan.replace('_', ' ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Status</dt>
                    <dd><span className="badge badge-success capitalize">{subscription.status}</span></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Expires</dt>
                    <dd>{subscription.expires_at ? new Date(subscription.expires_at).toLocaleString() : 'Never'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  No active subscription row for this guild.
                </p>
              )}
            </div>
          </AdminCard>
        </div>
      ) : (
        <AdminCard title="Recent servers" desc="Submit empty to browse the latest registrations.">
          <div className="divide-y divide-border/50">
            {list.length === 0 ? (
              <p className="p-6 text-sm text-muted text-center">Search by ID or load recent guilds.</p>
            ) : (
              list.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setQ(g.id); void search({ preventDefault: () => {} } as React.FormEvent); }}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-white/[0.02] transition text-left"
                >
                  <span className="font-mono text-xs">{g.id}</span>
                  <span className="text-muted capitalize">{g.plan.replace('_', ' ')} · {g.prefix}</span>
                </button>
              ))
            )}
          </div>
        </AdminCard>
      )}
    </div>
  );
}
