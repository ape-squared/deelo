'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import { Activity, RefreshCw, Server, Zap, Database, Globe, ExternalLink } from 'lucide-react';

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
  operational: { label: 'All systems operational', color: 'text-green-400', dot: 'bg-green-400', ring: 'border-green-500/30 bg-green-500/10' },
  degraded: { label: 'Partial outage', color: 'text-amber-400', dot: 'bg-amber-400', ring: 'border-amber-500/30 bg-amber-500/10' },
  down: { label: 'Major outage', color: 'text-red-400', dot: 'bg-red-400', ring: 'border-red-500/30 bg-red-500/10' },
};

const SERVICE_ICONS: Record<string, typeof Server> = {
  discord: Zap,
  bot: Server,
  database: Database,
  dashboard: Globe,
};

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overall = data?.status ?? 'operational';
  const meta = STATUS_META[overall];

  return (
    <>
      <SiteHeader />
      <main className="mesh-bg flex-1">
        <div className="mx-auto max-w-4xl px-4 py-16 lg:px-6">
          <div className="mb-10 text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Activity className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">System Status</h1>
            <p className="mt-3 text-muted">Real-time health for Deelo bot and services</p>
          </div>

          <div className={`status-hero mb-8 rounded-2xl border p-6 sm:p-8 animate-fade-up ${meta.ring}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`relative flex h-3 w-3 ${loading ? 'animate-pulse' : ''}`}>
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.dot} animate-ping`} />
                  <span className={`relative inline-flex h-3 w-3 rounded-full ${meta.dot}`} />
                </span>
                <div>
                  <p className={`text-lg font-semibold ${meta.color}`}>{loading ? 'Checking…' : meta.label}</p>
                  {data?.bot.checkedAt && (
                    <p className="text-xs text-muted mt-0.5">
                      Last checked {new Date(data.bot.checkedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" onClick={load} className="btn-secondary text-sm py-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {data && (
            <div className="mb-8 grid gap-4 sm:grid-cols-3 animate-fade-up">
              <StatBox label="Servers" value={data.bot.guildCount.toLocaleString()} />
              <StatBox label="API latency" value={data.bot.latencyMs != null ? `${data.bot.latencyMs}ms` : '—'} />
              <StatBox label="Shards" value={data.bot.shards?.toString() ?? '1'} />
            </div>
          )}

          <div className="card overflow-hidden animate-fade-up">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold">Services</h2>
            </div>
            <div className="divide-y divide-border/60">
              {(data?.services ?? []).map((svc) => {
                const Icon = SERVICE_ICONS[svc.id] ?? Activity;
                const s = STATUS_META[svc.status];
                return (
                  <div key={svc.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.02] transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{svc.label}</p>
                        <p className="text-xs text-muted truncate">{svc.detail}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 flex items-center gap-1.5 text-xs font-medium capitalize ${s.color}`}>
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      {svc.status}
                    </span>
                  </div>
                );
              })}
              {!data?.services?.length && !loading && (
                <p className="p-8 text-center text-sm text-muted">Could not load service status.</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted">
            <Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
            <Link href="/commands" className="hover:text-foreground transition">Commands</Link>
            <a href="https://discord.gg/deelo" className="inline-flex items-center gap-1 hover:text-foreground transition" target="_blank" rel="noreferrer">
              Support <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
