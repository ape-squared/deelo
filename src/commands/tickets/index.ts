import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import {
  addUserToTicket,
  assertTicketsFeature,
  blacklistAdd,
  blacklistList,
  blacklistRemove,
  buildPanelComponents,
  buildTranscript,
  claimTicket,
  closeTicket,
  createPanelRecord,
  deletePanelRecord,
  getPanelById,
  getTicketByChannel,
  getTicketStats,
  listOpenTickets,
  listPanels,
  moveTicketToCategory,
  parseTicketChannel,
  removeUserFromTicket,
  renameTicketChannel,
  setPanelMessageId,
  unclaimTicket,
} from '../../services/tickets';

function mentionId(message: import('discord.js').Message): string | null {
  return message.mentions.users.first()?.id ?? message.mentions.roles.first()?.id ?? null;
}

function snowflakeArg(value?: string): string | null {
  if (!value) return null;
  const s = value.trim();
  return /^\d{17,20}$/.test(s) ? s : null;
}

const tickets: Command[] = [
  {
    name: 'tickets',
    aliases: ['ticket', 'tix'],
    description: 'Support ticket system — panels, claim, close, transcripts',
    category: 'tickets',
    usage: 'tickets <panel|panels|list|claim|unclaim|close|rename|stats|transcript|add|remove|move|blacklist|delete|resend|reason>',
    premiumFeature: 'tickets',
    run: async ({ message, args }) => {
      if (!message.guild || !message.member) return;
      const guildId = message.guild.id;
      const sub = args[0]?.toLowerCase() ?? '';
      const rest = args.slice(1);

      const gate = await assertTicketsFeature(guildId);
      if (!gate.ok && sub !== 'stats') {
        return void message.reply({ embeds: [errorEmbed(gate.reason)] });
      }

      if (!sub || sub === 'help') {
        return void message.reply({
          embeds: [
            deeloEmbed(
              'Tickets',
              [
                '**Panels:** `panel [name]` · `panels` · `delete <id>` · `resend <id>`',
                '**Tickets:** `list` · `claim` · `unclaim` · `close [reason]` · `rename <name>`',
                '**Members:** `add @user` · `remove @user` · `move #category`',
                '**Moderation:** `blacklist add @user` · `blacklist remove <id>` · `blacklist list`',
                '**Info:** `stats` · `transcript` · `reason <text>`',
                '',
                'Configure panels in the **dashboard** → Tickets module.',
              ].join('\n'),
            ),
          ],
        });
      }

      if (sub === 'panel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return void message.reply({ embeds: [errorEmbed('Administrator required.')] });
        }
        const name = rest[0] ?? 'Support';
        const channel = parseTicketChannel(message);
        if (!channel) return;

        const supportRole = message.mentions.roles.first()?.id ?? snowflakeArg(rest[1]);
        const categoryMention = message.mentions.channels.first();
        const categoryId = categoryMention?.type === 4 ? categoryMention.id : null;

        const { panel, error } = await createPanelRecord(guildId, {
          name,
          channel_id: channel.id,
          category_id: categoryId,
          support_role: supportRole,
        });
        if (!panel || error) {
          return void message.reply({ embeds: [errorEmbed(error ?? 'Failed to create panel.')] });
        }

        const panelMsg = await channel.send({
          embeds: [deeloEmbed('🎫 Support', `Click below to open a **${name}** ticket.`)],
          components: buildPanelComponents(panel.id),
        });
        await setPanelMessageId(panel.id, panelMsg.id);
        return void message.reply({ embeds: [successEmbed(`Ticket panel **${name}** (#${panel.id}) posted to ${channel}.`)] });
      }

      if (sub === 'panels') {
        const panels = await listPanels(guildId);
        const list = panels.map((p) => `**#${p.id}** ${p.name} → <#${p.channel_id}>${p.message_id ? '' : ' *(message missing)*'}`).join('\n') || 'No panels yet.';
        return void message.reply({ embeds: [deeloEmbed('Ticket panels', list)] });
      }

      if (sub === 'delete') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return void message.reply({ embeds: [errorEmbed('Administrator required.')] });
        }
        const id = parseInt(rest[0] ?? '', 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,tickets delete <panel id>`')] });
        const panel = await getPanelById(guildId, id);
        if (!panel) return void message.reply({ embeds: [errorEmbed('Panel not found.')] });
        if (panel.message_id) {
          const ch = await message.guild.channels.fetch(panel.channel_id).catch(() => null);
          if (ch?.isTextBased()) await ch.messages.delete(panel.message_id).catch(() => {});
        }
        await deletePanelRecord(guildId, id);
        return void message.reply({ embeds: [successEmbed(`Deleted panel **${panel.name}** (#${id}).`)] });
      }

      if (sub === 'resend') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return void message.reply({ embeds: [errorEmbed('Administrator required.')] });
        }
        const id = parseInt(rest[0] ?? '', 10);
        const panel = id ? await getPanelById(guildId, id) : null;
        if (!panel) return void message.reply({ embeds: [errorEmbed('Usage: `,tickets resend <panel id>`')] });
        const ch = await message.guild.channels.fetch(panel.channel_id).catch(() => null);
        if (!ch?.isTextBased()) return void message.reply({ embeds: [errorEmbed('Panel channel not found.')] });
        if (panel.message_id) await ch.messages.delete(panel.message_id).catch(() => {});
        const panelMsg = await ch.send({
          embeds: [deeloEmbed('🎫 Support', `Click below to open a **${panel.name}** ticket.`)],
          components: buildPanelComponents(panel.id),
        });
        await setPanelMessageId(panel.id, panelMsg.id);
        return void message.reply({ embeds: [successEmbed(`Reposted panel **${panel.name}** in ${ch}.`)] });
      }

      if (sub === 'list') {
        const open = await listOpenTickets(guildId);
        const list = open.map((t) => `**#${t.id}** <#${t.channel_id}> — <@${t.user_id}>${t.claimed_by ? ` (claimed by <@${t.claimed_by}>)` : ''}`).join('\n') || 'No open tickets.';
        return void message.reply({ embeds: [deeloEmbed('Open tickets', list)] });
      }

      if (sub === 'stats') {
        const stats = await getTicketStats(guildId);
        return void message.reply({
          embeds: [deeloEmbed('Ticket stats', `**Open:** ${stats.open}\n**Closed:** ${stats.closed}\n**Panels:** ${stats.panels}`)],
        });
      }

      const channel = parseTicketChannel(message);
      const ticket = channel ? await getTicketByChannel(channel.id) : null;

      if (sub === 'claim') {
        if (!ticket || ticket.status !== 'open') return void message.reply({ embeds: [errorEmbed('Not an open ticket channel.')] });
        await claimTicket(ticket, message.author.id);
        return void message.reply({ embeds: [successEmbed(`${message.author} claimed this ticket.`)] });
      }

      if (sub === 'unclaim') {
        if (!ticket || ticket.status !== 'open') return void message.reply({ embeds: [errorEmbed('Not an open ticket channel.')] });
        await unclaimTicket(ticket);
        return void message.reply({ embeds: [successEmbed('Ticket unclaimed.')] });
      }

      if (sub === 'close') {
        if (!channel || !ticket || ticket.status !== 'open') {
          return void message.reply({ embeds: [errorEmbed('Run this inside an open ticket channel.')] });
        }
        const reason = rest.join(' ') || undefined;
        await closeTicket(channel, { reason, closerId: message.author.id });
        return void message.reply({ embeds: [successEmbed('Ticket closed. Channel will be deleted in 5 seconds. Transcript saved if a log channel is configured.')] });
      }

      if (sub === 'rename') {
        if (!channel || !ticket) return void message.reply({ embeds: [errorEmbed('Not a ticket channel.')] });
        const name = rest.join(' ') || 'ticket';
        await renameTicketChannel(channel, name);
        return void message.reply({ embeds: [successEmbed(`Ticket renamed to **${name}**.`)] });
      }

      if (sub === 'transcript') {
        if (!channel) return void message.reply({ embeds: [errorEmbed('Run this inside a ticket channel.')] });
        const text = await buildTranscript(channel, ticket);
        const file = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `ticket-${ticket?.id ?? channel.id}.txt` });
        return void message.reply({ files: [file] });
      }

      if (sub === 'reason') {
        if (!channel || !ticket) return void message.reply({ embeds: [errorEmbed('Not a ticket channel.')] });
        const reason = rest.join(' ') || 'No reason provided';
        await channel.send({ embeds: [deeloEmbed('Close reason', reason)] });
        return void message.reply({ embeds: [successEmbed('Reason recorded in the ticket channel.')] });
      }

      if (sub === 'add' || sub === 'allow') {
        if (!channel || !ticket) return void message.reply({ embeds: [errorEmbed('Run this inside a ticket channel.')] });
        const userId = mentionId(message) ?? snowflakeArg(rest[0]);
        if (!userId) return void message.reply({ embeds: [errorEmbed('Mention a user or provide a user ID.')] });
        await addUserToTicket(channel, userId);
        return void message.reply({ embeds: [successEmbed(`Added <@${userId}> to this ticket.`)] });
      }

      if (sub === 'remove' || sub === 'deny') {
        if (!channel || !ticket) return void message.reply({ embeds: [errorEmbed('Run this inside a ticket channel.')] });
        const userId = mentionId(message) ?? snowflakeArg(rest[0]);
        if (!userId) return void message.reply({ embeds: [errorEmbed('Mention a user or provide a user ID.')] });
        if (userId === ticket.user_id) return void message.reply({ embeds: [errorEmbed('Cannot remove the ticket opener.')] });
        await removeUserFromTicket(channel, userId);
        return void message.reply({ embeds: [successEmbed(`Removed <@${userId}> from this ticket.`)] });
      }

      if (sub === 'move') {
        if (!channel || !ticket) return void message.reply({ embeds: [errorEmbed('Run this inside a ticket channel.')] });
        const cat = message.mentions.channels.first();
        if (!cat || cat.type !== 4) return void message.reply({ embeds: [errorEmbed('Mention a category channel.')] });
        await moveTicketToCategory(channel, cat.id);
        return void message.reply({ embeds: [successEmbed(`Moved ticket to **${cat.name}**.`)] });
      }

      if (sub === 'blacklist') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return void message.reply({ embeds: [errorEmbed('Manage Server permission required.')] });
        }
        const action = rest[0]?.toLowerCase() ?? 'list';
        if (action === 'list') {
          const rows = await blacklistList(guildId);
          const list = rows.map((r) => `${r.target_type === 'role' ? `<@&${r.target_id}>` : `<@${r.target_id}>`} (\`${r.target_id}\`)`).join('\n') || 'Nobody is blacklisted.';
          return void message.reply({ embeds: [deeloEmbed('Ticket blacklist', list)] });
        }
        if (action === 'add') {
          const user = message.mentions.users.first();
          const role = message.mentions.roles.first();
          const id = user?.id ?? role?.id ?? snowflakeArg(rest[1]);
          if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,tickets blacklist add @user`')] });
          await blacklistAdd(guildId, id, role ? 'role' : 'user');
          return void message.reply({ embeds: [successEmbed('Added to ticket blacklist.')] });
        }
        if (action === 'remove') {
          const id = snowflakeArg(rest[1]) ?? mentionId(message);
          if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,tickets blacklist remove <id>`')] });
          await blacklistRemove(guildId, id);
          return void message.reply({ embeds: [successEmbed('Removed from ticket blacklist.')] });
        }
        return void message.reply({ embeds: [errorEmbed('Usage: `,tickets blacklist <add|remove|list>`')] });
      }

      if (['forms', 'form', 'options', 'profile', 'profiles', 'trainee', 'reopen'].includes(sub)) {
        return void message.reply({
          embeds: [
            deeloEmbed(
              `Tickets — ${sub}`,
              sub === 'forms' || sub === 'form'
                ? 'Custom ticket forms are configured in the **dashboard** (Tickets module). The bot opens tickets from panel buttons.'
                : sub === 'reopen'
                  ? 'Reopen closed tickets from the dashboard or create a new panel ticket.'
                  : 'Manage ticket panels and staff roles in the **dashboard** → Tickets.',
            ),
          ],
        });
      }

      return void message.reply({ embeds: [errorEmbed('Unknown subcommand. Use `,tickets help` for a list.')] });
    },
  },
];

export default tickets;
