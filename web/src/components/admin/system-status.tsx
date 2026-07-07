'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminPageHeader, AdminStatCard, AdminCard } from '@/components/admin/ui';

export function AdminSystemStatus() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const online = status?.online === true || (status as { bot?: { online?: boolean } })?.bot?.online === true;
  const bot = (status as { bot?: { latencyMs?: number; guildCount?: number; shards?: number } })?.bot;
  const services = (status as { services?: Array<{ label: string; status: string; detail: string }> })?.services ?? [];

  return (
    <div>
      <AdminPageHeader
        badge="Operations"
        title="System status"
        description="Live health from the status API — bot connectivity, database, and dashboard services."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <AdminStatCard
          label="Bot connectivity"
          value={online ? 'Online' : 'Offline'}
          icon="server"
          variant={online ? 'success' : 'danger'}
        />
        <AdminStatCard label="Guilds served" value={bot?.guildCount ?? '—'} icon="server" />
        <AdminStatCard label="API latency" value={bot?.latencyMs != null ? `${bot.latencyMs}ms` : '—'} icon="clock" />
      </div>

      {services.length > 0 && (
        <AdminCard title="Services" className="mb-6">
          <div className="divide-y divide-border/50">
            {services.map((s) => (
              <div key={s.label} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted">{s.detail}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      <AdminCard title="Raw payload">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-10 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <pre className="p-5 text-xs overflow-auto max-h-[50vh] text-muted">{JSON.stringify(status, null, 2)}</pre>
        )}
      </AdminCard>
    </div>
  );
}
