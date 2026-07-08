'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { inviteApiPath } from '@/lib/invite';
import { discordAvatarUrl } from '@/lib/discord-avatar';
import { DashboardShell, GuildIcon, PageHeader } from '@/components/dashboard/shell';
import { WelcomeChecklist } from '@/components/dashboard/welcome-checklist';
import { LoadingScreen, EmptyState } from '@/components/ui/animate';
import { DiscordIcon } from '@/components/icons/discord';
import { SearchField } from '@/components/search-field';
import { Server, Crown, Plus } from 'lucide-react';

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

function authErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    token: 'Discord sign-in failed. Try again in a fresh tab (don’t refresh the callback URL).',
    invalid_client:
      'Discord rejected the client secret. Set DISCORD_CLIENT_SECRET on the web service to match Discord Developer Portal.',
    missing_secret: 'DISCORD_CLIENT_SECRET is not set on the web container.',
    redirect_uri:
      'Redirect URI mismatch. Register your site URL + /api/auth/discord/callback in Discord OAuth2 redirects.',
    invalid_grant:
      'Authorization expired or already used. Click “Continue with Discord” again.',
    server_config: 'Server OAuth configuration error. Check web container logs.',
    no_code: 'Discord did not return an authorization code. Try signing in again.',
    user: 'Could not load your Discord profile after sign-in. Try again.',
  };
  return messages[code] ?? 'Sign-in failed. Please try again.';
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [emptyHint, setEmptyHint] = useState('');
  const [search, setSearch] = useState('');
  const [officialMember, setOfficialMember] = useState<boolean | null>(null);
  const [officialGuildInvite, setOfficialGuildInvite] = useState('https://discord.gg/deelo');

  useEffect(() => {
    fetch('/api/guilds')
      .then(async (r) => {
        if (r.status === 401) { setLoading(false); return; }
        const data = await r.json();
        if (!r.ok) { setLoading(false); return; }
        setUser(data.user);
        setGuilds(data.guilds ?? []);
        setOfficialMember(data.officialMember ?? false);
        if (data.officialGuildInvite) setOfficialGuildInvite(data.officialGuildInvite);
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
      <div className="dashboard-app mesh-bg v3-mesh flex min-h-screen items-center justify-center px-4">
        <div className="card gradient-border w-full max-w-md p-10 text-center animate-scale-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865F2]/20">
            <DiscordIcon className="h-9 w-11 text-[#5865F2]" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted mb-8 text-sm">Sign in with Discord to manage Deelo across your servers.</p>
          {authError && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200">
              {authErrorMessage(authError)}
            </div>
          )}
          <a href="/api/auth/discord?return=/dashboard%3Fwelcome%3D1" className="btn-primary w-full bg-[#5865F2] hover:bg-[#4752C4]">
            Continue with Discord
          </a>
        </div>
      </div>
    );
  }

  const userAvatar = discordAvatarUrl(user.id, user.avatar, 64);
  const filtered = guilds.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const withBot = filtered.filter((g) => g.botPresent);
  const withoutBot = filtered.filter((g) => !g.botPresent);

  return (
    <DashboardShell
      user={{ username: user.username, avatar: userAvatar }}
      guilds={guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon, botPresent: g.botPresent, plan: g.plan }))}
      onLogout={logout}
    >
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <PageHeader
            title="Select a server"
            description="Choose a server to manage its modules and settings."
            badge={<span className="badge badge-accent">{withBot.length} active</span>}
            action={
              <a href={inviteApiPath()} className="btn-primary text-sm py-2.5" target="_blank" rel="noreferrer">
                <Plus className="h-4 w-4" />
                Add to server
              </a>
            }
          />

          <WelcomeChecklist hasBot={withBot.length > 0} show={searchParams.get('welcome') === '1'} />

          {officialMember === false && (
            <div className="card mb-8 border-accent/20 bg-accent/5 p-5 text-sm">
              <p className="font-medium">Join our Discord community</p>
              <p className="mt-1 text-muted">
                Optional — unlock feature voting and suggestions. Dashboard configuration works without joining.
              </p>
              <a href={officialGuildInvite} className="btn-secondary mt-3 inline-flex text-sm" target="_blank" rel="noreferrer">
                Join Discord server
              </a>
            </div>
          )}

          {guilds.length > 0 && (
            <SearchField
              className="mb-8 max-w-md"
              placeholder="Search servers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          {!guilds.length ? (
            <EmptyState
              icon={<Server className="h-7 w-7" />}
              title="No servers found"
              description={emptyHint}
              action={
                <div className="flex gap-3">
                  <a href="/api/auth/discord" className="btn-secondary text-sm">Re-login</a>
                  <a href={inviteApiPath()} className="btn-primary text-sm" target="_blank" rel="noreferrer">Invite bot</a>
                </div>
              }
            />
          ) : (
            <div className="space-y-10">
              {withBot.length > 0 && (
                <section>
                  <h2 className="module-group-title mb-4">Your servers</h2>
                  <div className="server-picker-grid dashboard-stagger">
                    {withBot.map((g) => (
                      <ServerPickerCard key={g.id} guild={g} />
                    ))}
                  </div>
                </section>
              )}
              {withoutBot.length > 0 && (
                <section>
                  <h2 className="module-group-title mb-4">Invite Deelo</h2>
                  <div className="server-picker-grid dashboard-stagger">
                    {withoutBot.map((g) => (
                      <ServerPickerCard key={g.id} guild={g} invite />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your servers..." />}>
      <DashboardContent />
    </Suspense>
  );
}

function ServerPickerCard({ guild: g, invite }: { guild: Guild; invite?: boolean }) {
  const content = (
    <>
      <div className="server-picker-icon">
        <GuildIcon guild={g} size={72} rounded="xl" />
      </div>
      <p className="server-picker-name">{g.name}</p>
      {g.owner && <Crown className="absolute right-3 top-3 z-10 h-3.5 w-3.5 text-amber-400" />}
      {!invite && (
        <span className="relative z-10 mt-1 text-[11px] capitalize text-muted">{g.plan.replace('_', ' ')}</span>
      )}
      {invite && (
        <span className="relative z-10 mt-1 text-[11px] text-muted">Not installed</span>
      )}
      <div className="server-picker-overlay">
        <span className="btn-primary text-xs py-2 px-4">{invite ? 'Invite' : 'Manage'}</span>
      </div>
    </>
  );

  if (invite) {
    return (
      <a
        href={inviteApiPath(g.id)}
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
