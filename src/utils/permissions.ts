import type { GuildMember, PermissionResolvable } from 'discord.js';

export function memberHasPermission(member: GuildMember, permission: PermissionResolvable): boolean {
  return member.permissions.has(permission);
}

export function canModerate(moderator: GuildMember, target: GuildMember): boolean {
  if (target.id === moderator.id) return false;
  if (target.id === moderator.guild.ownerId) return false;
  if (moderator.id === moderator.guild.ownerId) return true;
  return moderator.roles.highest.position > target.roles.highest.position;
}

export const MOD_PERMS = ['ModerateMembers', 'KickMembers', 'BanMembers', 'ManageMessages'] as const;
export const ADMIN_PERMS = ['Administrator', 'ManageGuild'] as const;
