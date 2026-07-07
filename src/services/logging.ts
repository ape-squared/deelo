import type { Guild, TextChannel } from 'discord.js';
import { getGuild, updateGuild } from '../database';
import { listConfigSection, setExtraConfig, getConfigValue, deleteConfigPath } from '../extended/lib/guild-config';
import { deeloEmbed } from '../utils/embeds';

export const LOG_EVENTS = [
  'moderation',
  'messages',
  'members',
  'channels',
  'roles',
  'voice',
  'join',
  'leave',
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

function isLogEvent(value: string): value is LogEvent {
  return (LOG_EVENTS as readonly string[]).includes(value);
}

export async function isLogIgnored(guildId: string, targetId: string): Promise<boolean> {
  const ignored = await getConfigValue<Record<string, boolean>>(guildId, 'logs.ignore');
  return Boolean(ignored?.[targetId]);
}

export async function getLogChannelId(guildId: string, event: LogEvent): Promise<string | null> {
  if (event === 'moderation') {
    const guild = await getGuild(guildId);
    if (guild.mod_log_channel) return guild.mod_log_channel;
  }
  const fromConfig = await getConfigValue<string>(guildId, `logs.${event}`);
  return fromConfig ?? null;
}

export async function resolveLogChannel(guild: Guild, event: LogEvent): Promise<TextChannel | null> {
  const id = await getLogChannelId(guild.id, event);
  if (!id) return null;
  const ch = guild.channels.cache.get(id);
  if (ch?.isTextBased() && !ch.isDMBased()) return ch as TextChannel;
  return null;
}

export async function setLogChannel(guildId: string, event: string, channelId: string): Promise<void> {
  const key = event.toLowerCase();
  if (!isLogEvent(key) && key !== 'mod') {
    throw new Error(`Unknown log event: ${event}`);
  }
  if (key === 'moderation' || key === 'mod') {
    await updateGuild(guildId, { mod_log_channel: channelId });
    await setExtraConfig(guildId, 'logs.moderation', channelId);
    return;
  }
  await setExtraConfig(guildId, `logs.${key}`, channelId);
}

export async function removeLogChannel(guildId: string, event: string, channelId?: string): Promise<boolean> {
  const key = event.toLowerCase();
  if (key === 'moderation' || key === 'mod') {
    const guild = await getGuild(guildId);
    if (channelId && guild.mod_log_channel !== channelId) return false;
    await updateGuild(guildId, { mod_log_channel: null });
    await deleteConfigPath(guildId, 'logs.moderation');
    return true;
  }
  const current = await getConfigValue<string>(guildId, `logs.${key}`);
  if (channelId && current !== channelId) return false;
  await deleteConfigPath(guildId, `logs.${key}`);
  return true;
}

export async function listLogChannels(guildId: string): Promise<Array<{ event: string; channelId: string }>> {
  const entries = await listConfigSection(guildId, 'logs');
  const map = new Map<string, string>();
  for (const [event, channelId] of entries) {
    if (event === 'ignore' || typeof channelId !== 'string') continue;
    map.set(event, channelId);
  }
  const guild = await getGuild(guildId);
  if (guild.mod_log_channel) map.set('moderation', guild.mod_log_channel);
  return [...map.entries()].map(([event, channelId]) => ({ event, channelId }));
}

export async function sendEventLog(
  guild: Guild,
  event: LogEvent,
  title: string,
  description: string,
  opts?: { userId?: string; channelId?: string },
): Promise<void> {
  if (opts?.userId && (await isLogIgnored(guild.id, opts.userId))) return;
  if (opts?.channelId && (await isLogIgnored(guild.id, opts.channelId))) return;
  const channel = await resolveLogChannel(guild, event);
  if (!channel) return;
  await channel.send({ embeds: [deeloEmbed(title, description)] }).catch(() => {});
}

export async function sendModLog(
  guild: Guild,
  title: string,
  description: string,
): Promise<void> {
  await sendEventLog(guild, 'moderation', title, description);
}
