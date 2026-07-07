'use client';

import { useMemo, useState } from 'react';
import { SearchField } from '@/components/search-field';
import { AdminCard, AdminEmpty, AdminStatCard } from '@/components/admin/ui';

interface User {
  discord_id: string;
  username: string;
  avatar: string | null;
  email: string | null;
  last_login: string | null;
  created_at: string | null;
}

export function AdminUsersTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  const [weekStart] = useState(() => Date.now() - 7 * 86400000);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.discord_id.includes(q) ||
      (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [users, search]);

  const activeWeek = users.filter((u) => {
    if (!u.last_login) return false;
    return new Date(u.last_login).getTime() > weekStart;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total users" value={users.length} icon="users" />
        <AdminStatCard label="Active this week" value={activeWeek} icon="users" variant="success" />
        <AdminStatCard label="With email" value={users.filter((u) => u.email).length} icon="users" />
      </div>

      <SearchField
        className="max-w-md"
        fieldSize="sm"
        placeholder="Search username, ID, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background/50 text-left text-muted">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Discord ID</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Last login</th>
                <th className="p-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.discord_id} className="border-b border-border/50 transition hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=32`} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-bold">
                          {u.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted">{u.discord_id}</td>
                  <td className="p-4 text-muted">{u.email ?? '—'}</td>
                  <td className="p-4 text-xs text-muted">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                  <td className="p-4 text-xs text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <AdminEmpty message="No users match your search." />}
      </AdminCard>
    </div>
  );
}
