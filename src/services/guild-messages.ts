import type { GuildMember, PartialGuildMember } from 'discord.js';
import { getGuild } from '../database';
import { getSupabase } from '../database/supabase';
import { formatGuildMessage, formatGuildMessageForUser } from '../lib/welcome-format';

export type GuildMessageKind = 'welcome' | 'goodbye';

export interface GuildMessageRow {
  id: number;
  guild_id: string;
  kind: GuildMessageKind;
  channel_id: string;
  message: string;
  enabled: boolean;
  created_at: string;
}

export async function addGuildMessage(
  guildId: string,
  kind: GuildMessageKind,
  channelId: string,
  message: string,
): Promise<GuildMessageRow> {
  const { data, error } = await getSupabase()
    .from('guild_messages')
    .insert({ guild_id: guildId, kind, channel_id: channelId, message })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GuildMessageRow;
}

export async function listGuildMessages(guildId: string, kind: GuildMessageKind): Promise<GuildMessageRow[]> {
  const { data, error } = await getSupabase()
    .from('guild_messages')
    .select('*')
    .eq('guild_id', guildId)
    .eq('kind', kind)
    .order('id');
  if (error) throw new Error(error.message);
  return (data ?? []) as GuildMessageRow[];
}

export async function getGuildMessage(guildId: string, id: number): Promise<GuildMessageRow | null> {
  const { data, error } = await getSupabase()
    .from('guild_messages')
    .select('*')
    .eq('guild_id', guildId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GuildMessageRow | null) ?? null;
}

export async function removeGuildMessage(guildId: string, id: number): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('guild_messages')
    .delete()
    .eq('guild_id', guildId)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function sendToChannel(
  guild: import('discord.js').Guild,
  memberId: string,
  channelId: string,
  content: string,
): Promise<void> {
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;
  await channel.send({ content, allowedMentions: { users: [memberId] } }).catch(() => {});
}

export async function sendWelcomeMessages(member: GuildMember): Promise<void> {
  const guildId = member.guild.id;
  const settings = await getGuild(guildId);
  const rows = (await listGuildMessages(guildId, 'welcome')).filter((r) => r.enabled);

  if (rows.length) {
    for (const row of rows) {
      await sendToChannel(member.guild, member.id, row.channel_id, formatGuildMessage(row.message, member));
    }
    return;
  }

  if (settings.welcome_channel && settings.welcome_message) {
    await sendToChannel(
      member.guild,
      member.id,
      settings.welcome_channel,
      formatGuildMessage(settings.welcome_message, member),
    );
  }
}

export async function sendGoodbyeMessages(member: GuildMember | PartialGuildMember): Promise<void> {
  const guildId = member.guild.id;
  const settings = await getGuild(guildId);
  const rows = (await listGuildMessages(guildId, 'goodbye')).filter((r) => r.enabled);
  const user = member.user;
  if (!user) return;

  const format = (template: string) =>
    formatGuildMessageForUser(template, user, member.guild);

  if (rows.length) {
    for (const row of rows) {
      await sendToChannel(member.guild, member.id, row.channel_id, format(row.message));
    }
    return;
  }

  if (settings.goodbye_channel && settings.goodbye_message) {
    await sendToChannel(member.guild, member.id, settings.goodbye_channel, format(settings.goodbye_message));
  }
}
