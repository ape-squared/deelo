import type { Message, GuildMember, Role, GuildBasedChannel } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { deeloEmbed, errorEmbed, successEmbed, resolveUserId, parseDuration, formatDuration, type GuildEmbedContext } from '../../utils/embeds';
import type { CommandDef } from '../types';

export type CmdMessage = Message;

async function resolveEmbedGuild(message: Message): Promise<GuildEmbedContext | undefined> {
  if (!message.guild) return undefined;
  const { getGuild, getGuildPlan } = await import('../../database');
  const [settings, plan] = await Promise.all([getGuild(message.guild.id), getGuildPlan(message.guild.id)]);
  return { extra_config: settings.extra_config, plan };
}

export async function reply(message: Message, embed: ReturnType<typeof deeloEmbed>) {
  await message.reply({ embeds: [embed] });
}

export async function replyError(message: Message, text: string) {
  const guild = await resolveEmbedGuild(message);
  await message.reply({ embeds: [errorEmbed(text, guild)] });
}

export async function replySuccess(message: Message, text: string) {
  const guild = await resolveEmbedGuild(message);
  await message.reply({ embeds: [successEmbed(text, guild)] });
}

export async function replyInfo(message: Message, title: string, body: string) {
  const guild = await resolveEmbedGuild(message);
  await message.reply({ embeds: [deeloEmbed(title, body, guild)] });
}

export function needManageGuild(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export function needAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function needMod(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

export function parseSubArgs(name: string, cmdName: string): string[] {
  const prefix = cmdName + ' ';
  return name.startsWith(prefix) ? name.slice(prefix.length).split(' ').filter(Boolean) : [];
}

export function cmdRoot(name: string): string {
  return name.split(' ')[0];
}

export function cmdTail(name: string): string {
  const parts = name.split(' ');
  return parts.slice(1).join(' ');
}

export function lastToken(name: string): string {
  const parts = name.split(' ');
  return parts[parts.length - 1] ?? name;
}

export { resolveUserId, parseDuration, formatDuration, deeloEmbed, errorEmbed, successEmbed };
export type { CommandDef };

export function mentionChannel(message: Message): GuildBasedChannel | null {
  return (message.mentions.channels.first() ?? null) as GuildBasedChannel | null;
}

export function mentionRole(message: Message): Role | null {
  return message.mentions.roles.first() ?? null;
}

export function mentionMember(message: Message): GuildMember | null {
  return message.mentions.members?.first() ?? null;
}
