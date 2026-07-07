'use client';

import { useEffect, useState } from 'react';

export default function StaffTeamPage() {
  const [staff, setStaff] = useState<unknown[]>([]);
  const [discordId, setDiscordId] = useState('');
  const [role, setRole] = useState('support');
  const [name, setName] = useState('');

  async function load() {
    const res = await fetch('/api/staff/platform-staff');
    const data = await res.json();
    if (res.ok) setStaff(data.staff ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/staff/platform-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId, role, display_name: name }),
    });
    setDiscordId('');
    setName('');
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/staff/platform-staff?discord_id=${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-bold mb-6">Platform team</h1>

      <form onSubmit={grant} className="card p-6 mb-8 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Discord ID</label>
          <input className="input font-mono text-sm" value={discordId} onChange={(e) => setDiscordId(e.target.value)} />
        </div>
        <div>
          <label className="label">Display name</label>
          <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
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

      <ul className="space-y-2">
        {(staff as { discord_id: string; role: string; display_name: string | null }[]).map((s) => (
          <li key={s.discord_id} className="card px-4 py-3 flex justify-between items-center text-sm">
            <div>
              <p className="font-mono font-medium">{s.discord_id}</p>
              <p className="text-muted text-xs capitalize">{s.display_name ?? '—'} · {s.role}</p>
            </div>
            <button type="button" className="btn-ghost text-red-400 text-xs" onClick={() => revoke(s.discord_id)}>Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
