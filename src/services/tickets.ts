import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Message,
  type TextChannel,
  type User,
} from 'discord.js';
import { getSupabase } from '../database/supabase';
import { getGuild, getGuildPlan } from '../database';
import { hasFeature, getLimit } from '../config/plans';
import { getConfigValue } from '../extended/lib/guild-config';
import { deeloEmbed } from '../utils/embeds';

export interface TicketRow {
  id: number;
  guild_id: string;
  channel_id: string;
  user_id: string;
  panel_name: string | null;
  claimed_by: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
}

export interface TicketPanelRow {
  id: number;
  guild_id: string;
  name: string;
  channel_id: string;
  message_id: string | null;
  category_id: string | null;
  support_role: string | null;
  form_json: unknown;
}

export async function isTicketsModuleDisabled(guildId: string): Promise<boolean> {
  return (await getConfigValue(guildId, 'modules.tickets.disabled', false)) === true;
}

export async function assertTicketsFeature(guildId: string): Promise<{ ok: true; plan: Awaited<ReturnType<typeof getGuildPlan>> } | { ok: false; reason: string }> {
  if (await isTicketsModuleDisabled(guildId)) {
    return { ok: false, reason: 'Tickets are disabled for this server. Enable them in the dashboard under Tickets.' };
  }
  const plan = await getGuildPlan(guildId);
  if (!hasFeature(plan, 'tickets')) {
    return { ok: false, reason: 'Tickets require **Premium**. Redeem a code with `,redeem` or upgrade via the dashboard.' };
  }
  return { ok: true, plan };
}

export async function isUserTicketBlacklisted(guildId: string, member: GuildMember): Promise<boolean> {
  const { data } = await getSupabase()
    .from('ticket_blacklist')
    .select('target_id, target_type')
    .eq('guild_id', guildId);

  if (!data?.length) return false;

  for (const row of data) {
    if (row.target_type === 'user' && row.target_id === member.id) return true;
    if (row.target_type === 'role' && member.roles.cache.has(row.target_id)) return true;
  }
  return false;
}

export async function getOpenTicketForUser(guildId: string, userId: string): Promise<TicketRow | null> {
  const { data } = await getSupabase()
    .from('tickets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .eq('status', 'open')
    .maybeSingle();
  return data;
}

export async function getTicketByChannel(channelId: string): Promise<TicketRow | null> {
  const { data } = await getSupabase()
    .from('tickets')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();
  return data;
}

export async function listOpenTickets(guildId: string): Promise<TicketRow[]> {
  const { data } = await getSupabase()
    .from('tickets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listPanels(guildId: string): Promise<TicketPanelRow[]> {
  const { data } = await getSupabase()
    .from('ticket_panels')
    .select('*')
    .eq('guild_id', guildId)
    .order('id');
  return data ?? [];
}

export async function getPanelById(guildId: string, panelId: number): Promise<TicketPanelRow | null> {
  const { data } = await getSupabase()
    .from('ticket_panels')
    .select('*')
    .eq('guild_id', guildId)
    .eq('id', panelId)
    .maybeSingle();
  return data;
}

export async function resolvePanel(guildId: string, customId: string): Promise<TicketPanelRow | null> {
  const suffix = customId.replace('ticket_open_', '');
  const panelId = parseInt(suffix, 10);

  if (Number.isFinite(panelId) && panelId > 0) {
    const panel = await getPanelById(guildId, panelId);
    if (panel) return panel;
  }

  const { data: byName } = await getSupabase()
    .from('ticket_panels')
    .select('*')
    .eq('guild_id', guildId)
    .eq('name', suffix)
    .maybeSingle();

  return byName;
}

export function buildPanelComponents(panelId: number) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_open_${panelId}`)
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫'),
    ),
  ];
}

export async function createPanelRecord(
  guildId: string,
  input: { name: string; channel_id: string; category_id?: string | null; support_role?: string | null },
): Promise<{ panel: TicketPanelRow | null; error?: string }> {
  const gate = await assertTicketsFeature(guildId);
  if (!gate.ok) return { panel: null, error: gate.reason };

  const { count } = await getSupabase()
    .from('ticket_panels')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId);

  const max = getLimit(gate.plan, 'maxTicketPanels');
  if ((count ?? 0) >= max) {
    return { panel: null, error: `Panel limit reached (${max}). Delete an existing panel first.` };
  }

  const { data, error } = await getSupabase()
    .from('ticket_panels')
    .insert({
      guild_id: guildId,
      name: input.name,
      channel_id: input.channel_id,
      category_id: input.category_id ?? null,
      support_role: input.support_role ?? null,
    })
    .select()
    .single();

  if (error || !data) return { panel: null, error: error?.message ?? 'Failed to save panel.' };
  return { panel: data };
}

export async function deletePanelRecord(guildId: string, panelId: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from('ticket_panels')
    .delete()
    .eq('guild_id', guildId)
    .eq('id', panelId);
  return !error;
}

export async function setPanelMessageId(panelId: number, messageId: string): Promise<void> {
  await getSupabase().from('ticket_panels').update({ message_id: messageId }).eq('id', panelId);
}

export async function openTicketFromPanel(
  guild: Guild,
  opener: User,
  panel: TicketPanelRow | null,
  panelNameFallback: string,
): Promise<{ channel: TextChannel } | { error: string }> {
  const gate = await assertTicketsFeature(guild.id);
  if (!gate.ok) return { error: gate.reason };

  const member = await guild.members.fetch(opener.id).catch(() => null);
  if (!member) return { error: 'Could not resolve your server membership.' };
  if (await isUserTicketBlacklisted(guild.id, member)) {
    return { error: 'You are blocked from opening tickets in this server.' };
  }

  const existing = await getOpenTicketForUser(guild.id, opener.id);
  if (existing) {
    return { error: `You already have an open ticket: <#${existing.channel_id}>` };
  }

  const overwrites: Array<{ id: string; allow?: bigint[]; deny?: bigint[] }> = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: opener.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
  ];

  if (panel?.support_role) {
    overwrites.push({
      id: panel.support_role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${opener.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: panel?.category_id ?? undefined,
    permissionOverwrites: overwrites,
  });

  const panelName = panel?.name ?? panelNameFallback;
  await getSupabase().from('tickets').insert({
    guild_id: guild.id,
    channel_id: channel.id,
    user_id: opener.id,
    panel_name: panelName,
  });

  const supportMention = panel?.support_role ? `<@&${panel.support_role}>` : '';
  await channel.send({
    embeds: [
      deeloEmbed(
        '🎫 Ticket Opened',
        `${opener}, support will be with you shortly.${supportMention ? `\n${supportMention}` : ''}\n\nStaff: \`,tickets claim\` · \`,tickets close\` · \`,tickets add @user\``,
      ),
    ],
  });

  return { channel };
}

export async function claimTicket(ticket: TicketRow, claimerId: string): Promise<void> {
  await getSupabase().from('tickets').update({ claimed_by: claimerId }).eq('id', ticket.id);
}

export async function unclaimTicket(ticket: TicketRow): Promise<void> {
  await getSupabase().from('tickets').update({ claimed_by: null }).eq('id', ticket.id);
}

export async function addUserToTicket(channel: TextChannel, userId: string): Promise<void> {
  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });
}

export async function removeUserFromTicket(channel: TextChannel, userId: string): Promise<void> {
  await channel.permissionOverwrites.delete(userId);
}

export async function moveTicketToCategory(channel: TextChannel, categoryId: string): Promise<void> {
  await channel.setParent(categoryId, { lockPermissions: false });
}

export async function renameTicketChannel(channel: TextChannel, name: string): Promise<void> {
  await channel.setName(name.replace(/\s+/g, '-').slice(0, 100));
}

export async function buildTranscript(channel: TextChannel, ticket?: TicketRow | null): Promise<string> {
  const lines: string[] = [
    `Ticket transcript — #${channel.name}`,
    ticket ? `Ticket ID: ${ticket.id} | User: ${ticket.user_id} | Panel: ${ticket.panel_name ?? '—'}` : '',
    `Channel: ${channel.id} | Exported: ${new Date().toISOString()}`,
    '─'.repeat(48),
    '',
  ];

  let lastId: string | undefined;
  for (let page = 0; page < 20; page++) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch?.size) break;
    const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const msg of sorted) {
      const time = msg.createdAt.toISOString();
      const author = msg.author?.tag ?? msg.author?.id ?? 'unknown';
      const content = msg.content || (msg.embeds[0]?.description ? `[embed] ${msg.embeds[0].description}` : '[attachment/embed]');
      lines.push(`[${time}] ${author}: ${content}`);
    }
    lastId = sorted[0]?.id;
    if (batch.size < 100) break;
  }

  return lines.filter(Boolean).join('\n');
}

export async function closeTicket(
  channel: TextChannel,
  options: { reason?: string; closerId?: string; deleteAfterMs?: number } = {},
): Promise<{ transcript: string }> {
  const ticket = await getTicketByChannel(channel.id);
  const transcript = await buildTranscript(channel, ticket);

  if (ticket && ticket.status === 'open') {
    await getSupabase()
      .from('tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', ticket.id);
  }

  const guildSettings = ticket ? await getGuild(ticket.guild_id) : null;
  const logChannelId = guildSettings?.mod_log_channel ?? (await getConfigValue<string | null>(channel.guildId, 'logs.tickets', null));

  if (logChannelId) {
    const logCh = channel.guild.channels.cache.get(logChannelId) ?? (await channel.guild.channels.fetch(logChannelId).catch(() => null));
    if (logCh?.isTextBased()) {
      const { AttachmentBuilder } = await import('discord.js');
      const file = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `ticket-${ticket?.id ?? channel.id}.txt` });
      await logCh.send({
        content: `Ticket closed${options.closerId ? ` by <@${options.closerId}>` : ''}${options.reason ? ` — ${options.reason}` : ''}`,
        files: [file],
      }).catch(() => {});
    }
  }

  const delay = options.deleteAfterMs ?? 5000;
  setTimeout(() => channel.delete().catch(() => {}), delay);

  return { transcript };
}

export async function getTicketStats(guildId: string): Promise<{ open: number; closed: number; panels: number }> {
  const [{ count: open }, { count: closed }, { count: panels }] = await Promise.all([
    getSupabase().from('tickets').select('*', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open'),
    getSupabase().from('tickets').select('*', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed'),
    getSupabase().from('ticket_panels').select('*', { count: 'exact', head: true }).eq('guild_id', guildId),
  ]);
  return { open: open ?? 0, closed: closed ?? 0, panels: panels ?? 0 };
}

export async function blacklistAdd(guildId: string, targetId: string, targetType: 'user' | 'role'): Promise<void> {
  await getSupabase().from('ticket_blacklist').upsert({ guild_id: guildId, target_id: targetId, target_type: targetType });
}

export async function blacklistRemove(guildId: string, targetId: string): Promise<void> {
  await getSupabase().from('ticket_blacklist').delete().eq('guild_id', guildId).eq('target_id', targetId);
}

export async function blacklistList(guildId: string): Promise<Array<{ target_id: string; target_type: string }>> {
  const { data } = await getSupabase().from('ticket_blacklist').select('target_id, target_type').eq('guild_id', guildId);
  return data ?? [];
}

export function isTicketStaff(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageChannels);
}

export function parseTicketChannel(message: Message): TextChannel | null {
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return null;
  return message.channel as TextChannel;
}
