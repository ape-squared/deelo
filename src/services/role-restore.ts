import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { getSupabase } from '../database/supabase';

export interface StoredMemberRoles {
  guild_id: string;
  user_id: string;
  role_ids: string[];
  nick: string | null;
  updated_at: string;
}

function rolesToStore(member: GuildMember): string[] {
  return member.roles.cache
    .filter((r) => r.id !== member.guild.id && !r.managed)
    .map((r) => r.id);
}

export async function saveMemberRoles(member: GuildMember): Promise<void> {
  const roleIds = rolesToStore(member);
  if (!roleIds.length && !member.nickname) return;

  await getSupabase()
    .from('stored_member_roles')
    .upsert({
      guild_id: member.guild.id,
      user_id: member.id,
      role_ids: roleIds,
      nick: member.nickname,
      updated_at: new Date().toISOString(),
    });
}

export async function getStoredMemberRoles(guildId: string, userId: string): Promise<StoredMemberRoles | null> {
  const { data, error } = await getSupabase()
    .from('stored_member_roles')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    role_ids: Array.isArray(data.role_ids) ? data.role_ids : [],
  };
}

export async function clearStoredMemberRoles(guildId: string, userId: string): Promise<void> {
  await getSupabase().from('stored_member_roles').delete().eq('guild_id', guildId).eq('user_id', userId);
}

export async function restoreMemberRoles(
  member: GuildMember,
  options: { clearAfter?: boolean } = {},
): Promise<{ restored: string[]; skipped: string[]; nickRestored: boolean }> {
  const stored = await getStoredMemberRoles(member.guild.id, member.id);
  if (!stored || (!stored.role_ids.length && !stored.nick)) {
    throw new Error('No saved roles found for this member.');
  }

  const me = member.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('I need the **Manage Roles** permission.');
  }

  const botTop = me.roles.highest.position;
  const restored: string[] = [];
  const skipped: string[] = [];

  for (const roleId of stored?.role_ids ?? []) {
    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
      skipped.push(roleId);
      continue;
    }
    if (role.managed) {
      skipped.push(role.name);
      continue;
    }
    if (role.position >= botTop) {
      skipped.push(role.name);
      continue;
    }
    if (!member.roles.cache.has(roleId)) {
      try {
        await member.roles.add(role, 'Role restore');
        restored.push(role.name);
      } catch {
        skipped.push(role.name);
      }
    } else {
      restored.push(role.name);
    }
  }

  let nickRestored = false;
  if (stored?.nick && me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
    await member.setNickname(stored.nick, 'Role restore').catch(() => {});
    nickRestored = member.nickname === stored.nick;
  }

  if (options.clearAfter && restored.length) {
    await clearStoredMemberRoles(member.guild.id, member.id);
  }

  return { restored, skipped, nickRestored };
}

export async function tryAutoRestoreOnJoin(member: GuildMember): Promise<boolean> {
  const stored = await getStoredMemberRoles(member.guild.id, member.id);
  if (!stored?.role_ids.length) return false;
  try {
    await restoreMemberRoles(member, { clearAfter: false });
    return true;
  } catch {
    return false;
  }
}
