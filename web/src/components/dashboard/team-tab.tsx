'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { DashButton, DashInput, DashPanel } from '@/components/ui/dashboard-kit';

interface TeamMember {
  discord_id: string;
  role: string;
  invited_by: string | null;
  created_at: string;
}

interface AuditRow {
  id: number;
  actor_discord_id: string;
  action: string;
  module: string | null;
  created_at: string;
}

export function TeamTab({
  guildId,
  setMessage,
}: {
  guildId: string;
  setMessage: (m: string) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [discordId, setDiscordId] = useState('');
  const [role, setRole] = useState('moderator');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/guilds/${guildId}/team`);
    const data = await res.json();
    if (res.ok) {
      setMembers(data.members ?? []);
      setAudit(data.audit ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [guildId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/guilds/${guildId}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Failed to add member');
      return;
    }
    setMessage('Team member added');
    setDiscordId('');
    await load();
    setTimeout(() => setMessage(''), 3000);
  }

  async function remove(id: string) {
    await fetch(`/api/guilds/${guildId}/team?discord_id=${id}`, { method: 'DELETE' });
    setMessage('Removed team member');
    await load();
    setTimeout(() => setMessage(''), 3000);
  }

  if (loading) return <p className="text-sm text-muted p-6">Loading team…</p>;

  return (
    <div className="space-y-6">
      <DashPanel title="Dashboard team" desc="Invite moderators or viewers who shouldn't need full server admin on Discord. Owners and Discord admins always have full access.">
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label">Discord user ID</label>
            <DashInput value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="123456789012345678" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin — full dashboard</option>
              <option value="moderator">Moderator — moderation modules</option>
              <option value="viewer">Viewer — read-only overview</option>
            </select>
          </div>
          <DashButton type="submit" size="sm">
            <UserPlus className="h-4 w-4" />
            Add
          </DashButton>
        </form>
      </DashPanel>

      <DashPanel title={`Members (${members.length})`}>
        {members.length === 0 ? (
          <p className="text-sm text-muted">No delegated members yet.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.discord_id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-mono font-medium">{m.discord_id}</p>
                  <p className="text-xs text-muted capitalize">{m.role} · added {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <button type="button" className="btn-ghost text-red-400 p-2" onClick={() => remove(m.discord_id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DashPanel>

      <DashPanel title="Recent activity">
        {audit.length === 0 ? (
          <p className="text-sm text-muted">No audit entries yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {audit.map((row) => (
              <li key={row.id} className="flex justify-between gap-4 rounded-lg bg-white/[0.02] px-3 py-2">
                <span><code className="text-xs">{row.action}</code>{row.module ? ` · ${row.module}` : ''}</span>
                <span className="text-xs text-muted shrink-0">{new Date(row.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </DashPanel>
    </div>
  );
}
