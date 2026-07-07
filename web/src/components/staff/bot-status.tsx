'use client';

import { useEffect, useState } from 'react';
import { Loader2, Server, Wifi, WifiOff } from 'lucide-react';
import { StaffPageHeader } from '@/components/staff/ui';

export function StaffBotStatus() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const online = status?.online === true || status?.status === 'online';

  return (
    <div>
      <StaffPageHeader
        badge="Developer"
        title="Bot status"
        description="Live health snapshot from the public status endpoint — shard counts, latency, and service checks."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="staff-stat-card">
          <div className="flex items-center gap-2 mb-2">
            {online ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
            <span className="text-sm font-medium">{online ? 'Online' : 'Offline / unknown'}</span>
          </div>
          <p className="staff-stat-label">Bot connectivity</p>
        </div>
        <div className="staff-stat-card">
          <p className="staff-stat-value">{String(status?.guilds ?? status?.guildCount ?? '—')}</p>
          <p className="staff-stat-label">Guilds</p>
        </div>
        <div className="staff-stat-card">
          <p className="staff-stat-value">{status?.ping != null ? `${status.ping}ms` : '—'}</p>
          <p className="staff-stat-label">Gateway ping</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted">
          <Server className="h-4 w-4" />
          Raw status payload
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <pre className="text-xs overflow-auto max-h-[60vh] text-muted">{JSON.stringify(status, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
