import { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getSupabase } from '../../database/supabase';

const tickets: Command[] = [
  {
    name: 'tickets',
    aliases: ['ticket', 'tix'],
    description: 'Support ticket system',
    category: 'tickets',
    usage: 'tickets <panel|list|close|claim|add|remove>',
    premiumFeature: 'tickets',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();

      if (sub === 'panel') {
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
          return void message.reply({ embeds: [errorEmbed('Administrator required.')] });
        }
        const name = args[1] ?? 'Support';
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`ticket_open_${name}`).setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
        );
        if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
        const panelMsg = await message.channel.send({
          embeds: [deeloEmbed('🎫 Support', `Click below to open a **${name}** ticket.`)],
          components: [row],
        });
        await getSupabase().from('ticket_panels').insert({
          guild_id: message.guild!.id,
          name,
          channel_id: message.channel.id,
          message_id: panelMsg.id,
        });
        return void message.reply({ embeds: [successEmbed(`Ticket panel **${name}** created.`)] });
      }

      if (sub === 'list') {
        const { data } = await getSupabase().from('tickets').select('*').eq('guild_id', message.guild!.id).eq('status', 'open');
        const list = data?.map((t) => `**#${t.id}** <#${t.channel_id}> — <@${t.user_id}>${t.claimed_by ? ` (claimed by <@${t.claimed_by}>)` : ''}`).join('\n') || 'No open tickets.';
        return void message.reply({ embeds: [deeloEmbed('Open Tickets', list)] });
      }

      if (sub === 'close') {
        const { data: ticket } = await getSupabase().from('tickets').select('*').eq('channel_id', message.channel.id).eq('status', 'open').maybeSingle();
        if (!ticket) return void message.reply({ embeds: [errorEmbed('Not a ticket channel.')] });
        await getSupabase().from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', ticket.id);
        await message.reply({ embeds: [successEmbed('Ticket closed. Channel will be deleted in 5s.')] });
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
        return;
      }

      if (sub === 'claim') {
        const { data: ticket } = await getSupabase().from('tickets').select('*').eq('channel_id', message.channel.id).eq('status', 'open').maybeSingle();
        if (!ticket) return void message.reply({ embeds: [errorEmbed('Not a ticket channel.')] });
        await getSupabase().from('tickets').update({ claimed_by: message.author.id }).eq('id', ticket.id);
        return void message.reply({ embeds: [successEmbed(`${message.author} claimed this ticket.`)] });
      }

      await message.reply({ embeds: [deeloEmbed('Tickets', 'Subcommands: `panel`, `list`, `close`, `claim`\nPremium feature — full ticket forms, stats & transcripts available.')] });
    },
  },
];

export default tickets;
