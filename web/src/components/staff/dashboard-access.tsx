'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Headphones, Loader2, Shield } from 'lucide-react';
import { SearchField } from '@/components/search-field';
import { StaffPageHeader } from '@/components/staff/ui';
import { platformRoleLabel } from '@/lib/platform-roles';
import type { PlatformStaffRole } from '@/lib/platform-roles';

type ActiveSession = {
  active: boolean;
  elevation?: { guildId: string; reason: string | null; grantedAt: string };
  guildName?: string;
  dashboardRole?: string;
};

export function StaffDashboardAccessTool({ staffRole }: { staffRole: PlatformStaffRole }) {
  const router = useRouter();
  const [guildId, setGuildId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<ActiveSession | null>(null);

  async function refreshSession() {
    const res = await fetch('/api/staff/dashboard-access');
    if (!res.ok) return;
    const data = (await res.json()) as ActiveSession;
    setSession(data);
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function grantAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/staff/dashboard-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: guildId.trim(), reason: reason.trim() || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not open dashboard access');
      return;
    }
    router.push(data.redirect ?? `/dashboard/${guildId.trim()}`);
  }

  async function endSession() {
    setEnding(true);
    await fetch('/api/staff/dashboard-access', { method: 'DELETE' });
    setEnding(false);
    setSession({ active: false });
  }

  const accessLabel =
    staffRole === 'support'
      ? 'read-only (viewer)'
      : staffRole === 'moderator'
        ? 'moderator (most modules)'
        : 'admin (full access except team)';

  return (
    <div>
      <StaffPageHeader
        badge="Support staff"
        title="Dashboard access"
        description="Open a user's server dashboard to troubleshoot settings, modules, and premium state. Your actions are logged."
      />

      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90 flex gap-3">
        <Shield className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <p className="font-medium text-amber-200">Your access level: {platformRoleLabel(staffRole)}</p>
          <p className="mt-1 text-amber-100/80">
            Dashboard sessions grant <strong>{accessLabel}</strong> for one hour. Support staff cannot edit settings; moderators and developers can.
          </p>
        </div>
      </div>

      {session?.active && session.elevation && (
        <div className="mb-8 card p-5 border border-accent/30 bg-accent/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Active support session</p>
              <p className="font-semibold mt-1">{session.guildName ?? session.elevation.guildId}</p>
              <p className="font-mono text-xs text-muted mt-1">{session.elevation.guildId}</p>
              {session.elevation.reason && (
                <p className="text-sm text-muted mt-2">Reason: {session.elevation.reason}</p>
              )}
              <p className="text-xs text-muted mt-2">
                Granted {new Date(session.elevation.grantedAt).toLocaleString()} · expires in ~1 hour
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/${session.elevation.guildId}`}
                className="btn-primary text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Open dashboard
              </Link>
              <button type="button" className="btn-secondary text-sm" disabled={ending} onClick={endSession}>
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={grantAccess} className="card p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Headphones className="h-4 w-4 text-accent" />
          Start support session
        </div>
        <div>
          <label className="label">Guild ID</label>
          <SearchField
            fieldSize="sm"
            placeholder="1523831534799425576"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
          />
          <p className="text-xs text-muted mt-1.5">Paste the server snowflake from guild lookup or a user report.</p>
        </div>
        <div>
          <label className="label">Reason (optional)</label>
          <textarea
            className="input min-h-[80px] text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ticket #42 — autoroles not applying on join"
            maxLength={500}
          />
        </div>
        <button type="submit" className="btn-primary text-sm" disabled={loading || !guildId.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Open server dashboard
        </button>
      </form>
    </div>
  );
}
