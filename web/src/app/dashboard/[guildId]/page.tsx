'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { LoadingScreen } from '@/components/ui/animate';
import { GuildSettingsEditor } from '@/components/dashboard/guild-settings-editor';
import { discordAvatarUrl } from '@/lib/discord-avatar';
import type { GuildDashboardRole } from '@/lib/guild-permissions';
import type { GuildFullConfig } from '@/lib/guild-types';

interface GuildMeta {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
  plan: string;
  dashboardRole?: string | null;
}

export default function GuildDashboardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const router = useRouter();
  const [config, setConfig] = useState<GuildFullConfig | null>(null);
  const [user, setUser] = useState<{ username: string; avatar: string | null } | null>(null);
  const [guilds, setGuilds] = useState<GuildMeta[]>([]);
  const [dashboardRole, setDashboardRole] = useState<GuildDashboardRole>('admin');

  const load = useCallback(async () => {
    const r = await fetch(`/api/guilds/${guildId}`);
    if (r.status === 401 || r.status === 403) { router.push('/dashboard'); return; }
    if (!r.ok) return;
    const data = await r.json();
    if (data.access?.role) setDashboardRole(data.access.role);
    setConfig({
      guild: data.guild,
      subscription: data.subscription ?? null,
      eventToggles: data.eventToggles ?? [],
      filters: data.filters ?? [],
      responders: data.responders ?? [],
      ticketPanels: data.ticketPanels ?? [],
      levelRewards: data.levelRewards ?? [],
      economyShopItems: data.economyShopItems ?? [],
      counters: data.counters ?? [],
      socialFeeds: data.socialFeeds ?? [],
      vanityRoles: data.vanityRoles ?? [],
      reactionTriggers: data.reactionTriggers ?? [],
      commandAliases: data.commandAliases ?? [],
      autoroles: data.autoroles ?? [],
      reactionRoles: data.reactionRoles ?? [],
      buttonRoles: data.buttonRoles ?? [],
      tickets: data.tickets ?? [],
      embeds: data.embeds ?? [],
      guildMessages: data.guildMessages ?? [],
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
          avatar: discordAvatarUrl(data.user.id, data.user.avatar, 64),
        });
      }
      if (data.guilds) {
        setGuilds(data.guilds.map((g: GuildMeta) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          botPresent: g.botPresent,
          plan: g.plan,
          dashboardRole: g.dashboardRole,
        })));
        const current = data.guilds.find((g: GuildMeta) => g.id === guildId);
        if (current?.dashboardRole) setDashboardRole(current.dashboardRole as GuildDashboardRole);
      }
    })().catch(() => {
      if (!cancelled) router.push('/dashboard');
    });
    return () => {
      cancelled = true;
    };
  }, [load, router, guildId]);

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
      dashboardRole={dashboardRole}
    >
      <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<LoadingScreen label="Loading server settings..." />}>
        <GuildSettingsEditor guildId={guildId} config={config} onReload={load} dashboardRole={dashboardRole} />
      </Suspense>
      </div>
    </DashboardShell>
  );
}
