import type { GuildMember } from 'discord.js';

export const WELCOME_VARIABLES = '{user}, {user.name}, {server}, {membercount}';

export function formatGuildMessage(template: string, member: GuildMember): string {
  return template
    .replace(/{user}/g, member.toString())
    .replace(/{user\.name}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, member.guild.memberCount.toString());
}

export function formatGuildMessageForUser(
  template: string,
  user: { toString(): string; username: string },
  guild: { name: string; memberCount: number },
): string {
  return template
    .replace(/{user}/g, user.toString())
    .replace(/{user\.name}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());
}
