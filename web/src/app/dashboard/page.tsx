'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getInviteUrl } from '@/lib/invite';
import { DashboardShell, GuildIcon, PageHeader } from '@/components/dashboard/shell';
import { LoadingScreen, EmptyState } from '@/components/ui/animate';
import { Server, Crown, Plus, Search } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
  plan: string;
  prefix: string;
}

interface User {
  id: string;
  username: string;
  avatar: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [emptyHint, setEmptyHint] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/guilds')
      .then(async (r) => {
        if (r.status === 401) { setLoading(false); return; }
        const data = await r.json();
        if (!r.ok) { setLoading(false); return; }
        setUser(data.user);
        setGuilds(data.guilds ?? []);
        if (data.error) setEmptyHint(data.error);
        else if (!data.guilds?.length) setEmptyHint('You need Administrator or Manage Server permission in a server to manage Deelo here.');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    setUser(null);
    setGuilds([]);
  }

  if (loading) return <LoadingScreen label="Loading your servers..." />;

  if (!user) {
    return (
      <div className="dashboard-app mesh-bg flex min-h-screen items-center justify-center px-4">
        <div className="card gradient-border w-full max-w-md p-10 text-center animate-scale-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865F2]/20">
            <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted mb-8 text-sm">Sign in with Discord to manage Deelo across your servers.</p>
          <a href="/api/auth/discord" className="btn-primary w-full bg-[#5865F2] hover:bg-[#4752C4]">
            Continue with Discord
          </a>
        </div>
      </div>
    );
  }

  const userAvatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : null;

  const filtered = guilds.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const withBot = filtered.filter((g) => g.botPresent);
  const withoutBot = filtered.filter((g) => !g.botPresent);

  return (
    <DashboardShell
      user={{ username: user.username, avatar: userAvatar }}
      guilds={guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon, botPresent: g.botPresent, plan: g.plan }))}
      onLogout={logout}
    >
      <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Select a server"
        description="Choose a server to manage its modules and settings."
        badge={<span className="badge badge-accent">{withBot.length} active</span>}
        action={
          <a href={getInviteUrl()} className="btn-primary text-sm py-2.5" target="_blank" rel="noreferrer">
            <Plus className="h-4 w-4" />
            Add to server
          </a>
        }
      />

      {guilds.length > 0 && (
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-11"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {!guilds.length ? (
        <EmptyState
          icon={<Server className="h-7 w-7" />}
          title="No servers found"
          description={emptyHint}
          action={
            <div className="flex gap-3">
              <a href="/api/auth/discord" className="btn-secondary text-sm">Re-login</a>
              <a href={getInviteUrl()} className="btn-primary text-sm" target="_blank" rel="noreferrer">Invite bot</a>
            </div>
          }
        />
      ) : (
        <div className="space-y-10">
          {withBot.length > 0 && (
            <section>
              <h2 className="module-group-title mb-4">Your servers</h2>
              <div className="server-picker-grid">
                {withBot.map((g) => (
                  <ServerPickerCard key={g.id} guild={g} />
                ))}
              </div>
            </section>
          )}
          {withoutBot.length > 0 && (
            <section>
              <h2 className="module-group-title mb-4">Invite Deelo</h2>
              <div className="server-picker-grid">
                {withoutBot.map((g) => (
                  <ServerPickerCard key={g.id} guild={g} invite />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </DashboardShell>
  );
}

function ServerPickerCard({ guild: g, invite }: { guild: Guild; invite?: boolean }) {
  const content = (
    <>
      <div className="server-picker-icon">
        <GuildIcon guild={g} size={72} rounded="xl" />
      </div>
      <p className="server-picker-name">{g.name}</p>
      {g.owner && <Crown className="absolute right-3 top-3 h-3.5 w-3.5 text-amber-400" />}
      {!invite && (
        <span className="mt-1 text-[11px] capitalize text-muted">{g.plan.replace('_', ' ')}</span>
      )}
      {invite && (
        <span className="mt-1 text-[11px] text-muted">Not installed</span>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="btn-primary text-xs py-2 px-4">{invite ? 'Invite' : 'Manage'}</span>
      </div>
    </>
  );

  if (invite) {
    return (
      <a
        href={getInviteUrl(g.id)}
        className="server-picker-card group relative"
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={`/dashboard/${g.id}`} className="server-picker-card group relative">
      {content}
    </Link>
  );
}
