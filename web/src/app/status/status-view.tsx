'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Database,
  Globe,
  RefreshCw,
  Server,
  Users,
  Zap,
  Gauge,
  Layers,
} from 'lucide-react';
import { PageRelatedLinks } from '@/components/marketing/page-related-links';

interface StatusPayload {
  status: 'operational' | 'degraded' | 'down';
  bot: {
    online: boolean;
    latencyMs: number | null;
    guildCount: number;
    bot: { id: string; username: string; avatar: string | null } | null;
    shards: number | null;
    checkedAt: string;
    error?: string;
  };
  services: Array<{
    id: string;
    label: string;
    status: 'operational' | 'degraded' | 'down';
    detail: string;
  }>;
}

const STATUS_META = {
  operational: {
    label: 'All systems operational',
    headline: 'Everything looks good',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    ring: 'status-banner-operational',
  },
  degraded: {
    label: 'Partial outage',
    headline: 'Some services degraded',
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    ring: 'status-banner-degraded',
  },
  down: {
    label: 'Major outage',
    headline: 'Service disruption',
    color: 'text-red-400',
    dot: 'bg-red-400',
    ring: 'status-banner-down',
  },
} as const;

const SERVICE_ICONS: Record<string, typeof Server> = {
  discord: Zap,
  bot: Server,
  database: Database,
  dashboard: Globe,
};

export function StatusView() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overall = data?.status ?? 'operational';
  const meta = STATUS_META[overall];
  const busy = loading || refreshing;

  return (
    <div className="space-y-8">
      <div className={`status-banner animate-fade-up ${meta.ring}`}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`status-pulse-ring ${busy ? 'animate-pulse' : ''}`}>
              <span className={`status-pulse-dot ${meta.dot}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">System health</p>
              <p className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${meta.color}`}>
                {loading ? 'Checking status…' : meta.headline}
              </p>
              <p className="mt-1 text-sm text-muted">{loading ? 'Pinging services' : meta.label}</p>
              {data?.bot.checkedAt && !loading && (
                <p className="mt-2 text-xs text-muted/80">
                  Last checked {new Date(data.bot.checkedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={busy}
            className="btn-secondary shrink-0 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="status-stat-grid animate-fade-up">
          {[Users, Gauge, Layers].map((Icon, i) => (
            <div key={i} className="status-stat-card">
              <div className="status-stat-icon skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-7 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="status-stat-grid animate-fade-up">
          <StatusStat icon={Users} label="Servers" value={data.bot.guildCount.toLocaleString()} />
          <StatusStat
            icon={Gauge}
            label="API latency"
            value={data.bot.latencyMs != null ? `${data.bot.latencyMs} ms` : '—'}
          />
          <StatusStat icon={Layers} label="Shards" value={data.bot.shards?.toString() ?? '1'} />
        </div>
      ) : null}

      <div className="card overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold">Services</h2>
            <p className="text-xs text-muted mt-0.5">Bot, dashboard, database, and Discord API</p>
          </div>
          <Activity className="h-5 w-5 text-accent/60" />
        </div>
        <div className="divide-y divide-border/50">
          {(data?.services ?? []).map((svc) => {
            const Icon = SERVICE_ICONS[svc.id] ?? Activity;
            const s = STATUS_META[svc.status];
            return (
              <div key={svc.id} className="status-service-row">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="status-service-icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{svc.label}</p>
                    <p className="truncate text-xs text-muted">{svc.detail}</p>
                  </div>
                </div>
                <span className={`status-service-badge ${s.color}`}>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {svc.status}
                </span>
              </div>
            );
          })}
          {!data?.services?.length && !loading && (
            <p className="p-10 text-center text-sm text-muted">Could not load service status.</p>
          )}
          {loading && !data?.services?.length && (
            <div className="space-y-0 divide-y divide-border/50">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="status-service-row">
                  <div className="flex items-center gap-3">
                    <div className="status-service-icon skeleton-shimmer" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded skeleton-shimmer" />
                      <div className="h-3 w-40 rounded skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PageRelatedLinks
        className="pt-4"
        links={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/commands', label: 'Commands' },
          { href: '/support', label: 'Support' },
          { href: 'https://discord.gg/deelo', label: 'Discord', external: true },
        ]}
      />
    </div>
  );
}

function StatusStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="status-stat-card">
      <div className="status-stat-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="stat-value text-2xl sm:text-3xl">{value}</p>
        <p className="mt-0.5 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
