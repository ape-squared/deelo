import { ActivityType, type GuildMember, type Presence } from 'discord.js';
import { getSupabase } from '../database/supabase';

function customStatusText(presence: Presence | null | undefined): string {
  const activity = presence?.activities?.find((a) => a.type === ActivityType.Custom);
  return (activity?.state ?? '').toLowerCase();
}

/** Grant or revoke vanity roles based on custom status text. */
export async function syncVanityRoles(member: GuildMember, presence?: Presence | null): Promise<void> {
  const { data: rows } = await getSupabase()
    .from('vanity_roles')
    .select('vanity_string, role_id')
    .eq('guild_id', member.guild.id);

  if (!rows?.length) return;

  const status = customStatusText(presence ?? member.presence);

  for (const row of rows) {
    const needle = row.vanity_string.toLowerCase();
    const role = member.guild.roles.cache.get(row.role_id);
    if (!role) continue;

    const shouldHave = needle.length > 0 && status.includes(needle);
    const hasRole = member.roles.cache.has(row.role_id);

    if (shouldHave && !hasRole) {
      await member.roles.add(role).catch(() => {});
    } else if (!shouldHave && hasRole) {
      await member.roles.remove(role).catch(() => {});
    }
  }
}

/** Re-check vanity roles for every member when config changes (optional bulk sync). */
export async function syncAllVanityRolesInGuild(guildId: string): Promise<void> {
  const { data: rows } = await getSupabase().from('vanity_roles').select('guild_id').eq('guild_id', guildId).limit(1);
  if (!rows?.length) return;
  // Runtime sync happens on presenceUpdate; no bulk scan needed here.
}
