'use client';

import { useEffect, useState } from 'react';

export default function PlatformTeamPage() {
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
      setError(data.error ?? 'Failed to load platform team');
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
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-bold mb-2">Platform team</h1>
      <p className="text-sm text-muted mb-6">Grant Discord staff access to the admin panel. Staff sign in with Discord at the login page.</p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={grant} className="card p-6 mb-8 flex flex-wrap gap-3 items-end">
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
            <option value="support">Support</option>
            <option value="moderator">Moderator</option>
            <option value="developer">Developer</option>
            <option value="lead">Lead</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2.5">Grant access</button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading team…</p>
      ) : (
        <ul className="space-y-2">
          {(staff as { discord_id: string; role: string; display_name: string | null }[]).length === 0 ? (
            <li className="text-sm text-muted">No Discord staff members yet.</li>
          ) : (
            (staff as { discord_id: string; role: string; display_name: string | null }[]).map((s) => (
              <li key={s.discord_id} className="card px-4 py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-mono font-medium">{s.discord_id}</p>
                  <p className="text-muted text-xs capitalize">{s.display_name ?? '—'} · {s.role}</p>
                </div>
                <button type="button" className="btn-ghost text-red-400 text-xs" onClick={() => revoke(s.discord_id)}>Revoke</button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
