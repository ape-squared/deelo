import { NextResponse } from 'next/server';
import { getDashboardSession, fetchUserGuilds, canManageServer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ModuleId } from '@/lib/dashboard-modules';
import {
  guildMeetsRole,
  guildRoleCanRead,
  guildRoleCanWrite,
  type GuildDashboardRole,
} from '@/lib/guild-permissions';

export type { GuildDashboardRole } from '@/lib/guild-permissions';
export { guildMeetsRole, guildRoleCanRead, guildRoleCanWrite } from '@/lib/guild-permissions';

export interface GuildAccess {
  discordId: string;
  guildId: string;
  role: GuildDashboardRole;
  source: 'discord' | 'delegated';
}

export async function resolveGuildAccess(discordId: string, guildId: string): Promise<GuildAccess | null> {
  const result = await fetchUserGuilds(discordId);
  if (!result.ok) return null;

  const discordGuild = result.guilds.find((g) => g.id === guildId);
  if (discordGuild) {
    if (discordGuild.owner) {
      return { discordId, guildId, role: 'owner', source: 'discord' };
    }
    if (canManageServer(discordGuild)) {
      return { discordId, guildId, role: 'admin', source: 'discord' };
    }
  }

  const db = createAdminClient();
  const { data: member } = await db
    .from('guild_dashboard_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!member?.role) return null;

  return {
    discordId,
    guildId,
    role: member.role as GuildDashboardRole,
    source: 'delegated',
  };
}

export async function requireGuildAccess(
  guildId: string,
  options: { module?: ModuleId; write?: boolean; minimumRole?: GuildDashboardRole } = {},
) {
  const session = await getDashboardSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const access = await resolveGuildAccess(session.discordId, guildId);
  if (!access) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  if (options.minimumRole && !guildMeetsRole(access.role, options.minimumRole)) {
    return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
  }

  if (options.module) {
    const allowed = options.write
      ? guildRoleCanWrite(access.role, options.module)
      : guildRoleCanRead(access.role, options.module);
    if (!allowed) {
      return { error: NextResponse.json({ error: 'You cannot access this module' }, { status: 403 }) };
    }
  }

  return { session, access };
}

export async function logGuildDashboardAction(
  guildId: string,
  actorDiscordId: string,
  action: string,
  module?: string,
  metadata?: Record<string, unknown>,
) {
  await createAdminClient().from('guild_dashboard_audit_log').insert({
    guild_id: guildId,
    actor_discord_id: actorDiscordId,
    action,
    module: module ?? null,
    metadata: metadata ?? {},
  });
}
