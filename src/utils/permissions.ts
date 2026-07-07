import { PermissionFlagsBits, PermissionsBitField, type GuildMember, type PermissionResolvable } from 'discord.js';

/** Labels matching Discord's permission UI where they differ from flag names. */
const PERMISSION_LABELS: Partial<Record<keyof typeof PermissionFlagsBits, string>> = {
  Administrator: 'Administrator',
  ManageGuild: 'Manage Server',
  ManageRoles: 'Manage Roles',
  ManageChannels: 'Manage Channels',
  ManageMessages: 'Manage Messages',
  ManageNicknames: 'Manage Nicknames',
  ManageWebhooks: 'Manage Webhooks',
  ManageGuildExpressions: 'Manage Emojis & Stickers',
  ManageEvents: 'Manage Events',
  BanMembers: 'Ban Members',
  KickMembers: 'Kick Members',
  ModerateMembers: 'Timeout Members',
  MoveMembers: 'Move Members',
  MuteMembers: 'Mute Members',
  DeafenMembers: 'Deafen Members',
  ViewAuditLog: 'View Audit Log',
  ViewChannel: 'View Channels',
  SendMessages: 'Send Messages',
  Connect: 'Connect',
  Speak: 'Speak',
  UseVAD: 'Use Voice Activity',
  Stream: 'Video',
  AddReactions: 'Add Reactions',
  AttachFiles: 'Attach Files',
  EmbedLinks: 'Embed Links',
  MentionEveryone: 'Mention Everyone',
  ReadMessageHistory: 'Read Message History',
  UseExternalEmojis: 'Use External Emojis',
  UseExternalStickers: 'Use External Stickers',
  SendMessagesInThreads: 'Send Messages in Threads',
  CreatePublicThreads: 'Create Public Threads',
  CreatePrivateThreads: 'Create Private Threads',
  ManageThreads: 'Manage Threads',
  UseApplicationCommands: 'Use Application Commands',
  RequestToSpeak: 'Request to Speak',
  CreateEvents: 'Create Events',
  SendVoiceMessages: 'Send Voice Messages',
  SendPolls: 'Create Polls',
  UseEmbeddedActivities: 'Use Activities',
};

function splitPermissionFlag(flag: string): string {
  return flag
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

export function formatPermissionList(perms: PermissionResolvable[]): string {
  if (!perms.length) return 'unknown permissions';

  const flags = new PermissionsBitField(perms);
  const names = flags.toArray();
  if (names.length) {
    return names
      .map((flag) => PERMISSION_LABELS[flag as keyof typeof PermissionFlagsBits] ?? splitPermissionFlag(flag))
      .join(', ');
  }

  return perms.map(String).join(', ');
}

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
