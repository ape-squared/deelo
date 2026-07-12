import type { GuildMember } from 'discord.js';
import { getGuild } from '../database';
import { getSupabase } from '../database/supabase';

/** Assign primary + extra autoroles on member join. */
export async function applyJoinAutoroles(member: GuildMember, skipIfRestored: boolean): Promise<void> {
  if (skipIfRestored) return;

  const guild = await getGuild(member.guild.id);
  const roleIds = new Set<string>();

  if (guild.autorole) roleIds.add(guild.autorole);

  const { data: extras } = await getSupabase()
    .from('autoroles')
    .select('role_id')
    .eq('guild_id', member.guild.id);

  for (const row of extras ?? []) {
    if (row.role_id) roleIds.add(row.role_id);
  }

  for (const roleId of roleIds) {
    const role = member.guild.roles.cache.get(roleId);
    if (role && role.id !== member.guild.id) {
      await member.roles.add(role).catch(() => {});
    }
  }
}
