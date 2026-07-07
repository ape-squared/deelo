'use client';

import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard } from '@/components/admin/ui';
import { platformRoleLabel } from '@/lib/platform-roles';

export function AdminTeamManager() {
  const [staff, setStaff] = useState<unknown[]>([]);
  const [discordId, setDiscordId] = useState('');
  const [role, setRole] = useState('support');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/platform-staff');
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to load staff access list');
      return;
    }
    setStaff(data.staff ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/platform-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId, role, display_name: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to grant access');
      return;
    }
    setDiscordId('');
    setName('');
    await load();
  }

  async function revoke(id: string) {
    setError('');
    const res = await fetch(`/api/admin/platform-staff?discord_id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to revoke access');
      return;
    }
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        badge="Operations"
        title="Staff access"
        description="Grant Discord staff roles for the /staff portal — support, moderators, developers, and leads."
      />

      {error && <div className="admin-alert admin-alert-danger mb-6">{error}</div>}

      <AdminCard title="Grant access" desc="Staff sign in with Discord at /staff/login.">
        <form onSubmit={grant} className="p-5 lg:p-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Discord user ID</label>
            <input className="input font-mono text-sm" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="123456789012345678" required />
          </div>
          <div>
            <label className="label">Display name</label>
            <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="support">Support staff</option>
              <option value="moderator">Bot moderator</option>
              <option value="developer">Developer</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <button type="submit" className="btn-primary text-sm py-2.5">Grant access</button>
        </form>
      </AdminCard>

      <AdminCard title="Platform team" className="mt-6">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading team…</p>
        ) : (
          <div className="divide-y divide-border/50">
            {(staff as { discord_id: string; role: string; display_name: string | null; last_login: string | null }[]).length === 0 ? (
              <p className="p-6 text-sm text-muted text-center">No Discord staff members yet.</p>
            ) : (
              (staff as { discord_id: string; role: string; display_name: string | null; last_login: string | null }[]).map((s) => (
                <div key={s.discord_id} className="px-5 py-4 flex justify-between items-center gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono font-medium truncate">{s.discord_id}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {s.display_name ?? '—'} · {platformRoleLabel(s.role as import('@/lib/platform-roles').PlatformStaffRole)}
                      {s.last_login && <> · Last login {new Date(s.last_login).toLocaleDateString()}</>}
                    </p>
                  </div>
                  <button type="button" className="btn-ghost text-red-400 text-xs shrink-0" onClick={() => revoke(s.discord_id)}>Revoke</button>
                </div>
              ))
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
