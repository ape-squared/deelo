'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { LoadingScreen } from '@/components/ui/animate';
import { GuildSettingsEditor } from '@/components/dashboard/guild-settings-editor';
import type { GuildFullConfig } from '@/lib/guild-types';

interface GuildMeta {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
  plan: string;
}

export default function GuildDashboardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const router = useRouter();
  const [config, setConfig] = useState<GuildFullConfig | null>(null);
  const [user, setUser] = useState<{ username: string; avatar: string | null } | null>(null);
  const [guilds, setGuilds] = useState<GuildMeta[]>([]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/guilds/${guildId}`);
    if (r.status === 401 || r.status === 403) { router.push('/dashboard'); return; }
    if (!r.ok) return;
    const data = await r.json();
    setConfig({
      guild: data.guild,
      subscription: data.subscription ?? null,
      eventToggles: data.eventToggles ?? [],
      filters: data.filters ?? [],
      responders: data.responders ?? [],
      ticketPanels: data.ticketPanels ?? [],
      levelRewards: data.levelRewards ?? [],
      counters: data.counters ?? [],
      socialFeeds: data.socialFeeds ?? [],
      vanityRoles: data.vanityRoles ?? [],
      reactionTriggers: data.reactionTriggers ?? [],
      commandAliases: data.commandAliases ?? [],
      autoroles: data.autoroles ?? [],
      reactionRoles: data.reactionRoles ?? [],
      buttonRoles: data.buttonRoles ?? [],
      tickets: data.tickets ?? [],
    });
  }, [guildId, router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
      const r = await fetch('/api/guilds');
      if (!r.ok || cancelled) return;
      const data = await r.json();
      if (data.user) {
        setUser({
          username: data.user.username,
          avatar: data.user.avatar
            ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=64`
            : null,
        });
      }
      if (data.guilds) {
        setGuilds(data.guilds.map((g: GuildMeta) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          botPresent: g.botPresent,
          plan: g.plan,
        })));
      }
    })().catch(() => {
      if (!cancelled) router.push('/dashboard');
    });
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  const currentGuild = useMemo(
    () => guilds.find((g) => g.id === guildId) ?? null,
    [guilds, guildId],
  );

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dashboard');
    router.refresh();
  }

  if (!config) return <LoadingScreen label="Loading server settings..." />;

  return (
    <DashboardShell
      user={user}
      guilds={guilds}
      currentGuild={currentGuild ? { ...currentGuild, plan: config.guild.plan } : { id: guildId, name: 'Server', icon: null, plan: config.guild.plan }}
      onLogout={logout}
    >
      <Suspense fallback={<LoadingScreen label="Loading server settings..." />}>
        <GuildSettingsEditor guildId={guildId} config={config} onReload={load} />
      </Suspense>
    </DashboardShell>
  );
}
