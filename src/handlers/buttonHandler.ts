import type { DeeloClient } from '../client';
import { getSupabase } from '../database/supabase';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { deeloEmbed } from '../utils/embeds';

export function registerButtonHandlers(client: DeeloClient): void {
  if (client.buttonsRegistered) return;
  client.buttonsRegistered = true;

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('role_')) {
      const roleId = interaction.customId.replace('role_', '');
      const role = interaction.guild?.roles.cache.get(roleId);
      if (!role || !interaction.member || !('roles' in interaction.member)) return;
      const member = await interaction.guild!.members.fetch(interaction.user.id);
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Removed ${role}`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `Added ${role}`, ephemeral: true });
      }
      return;
    }

    if (interaction.customId.startsWith('ticket_open_')) {
      const panelName = interaction.customId.replace('ticket_open_', '');
      const { data: existing } = await getSupabase()
        .from('tickets')
        .select('*')
        .eq('guild_id', interaction.guild!.id)
        .eq('user_id', interaction.user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (existing) {
        return void interaction.reply({ content: `You already have an open ticket: <#${existing.channel_id}>`, ephemeral: true });
      }

      const channel = await interaction.guild!.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild!.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      await getSupabase().from('tickets').insert({
        guild_id: interaction.guild!.id,
        channel_id: channel.id,
        user_id: interaction.user.id,
        panel_name: panelName,
      });

      await channel.send({ embeds: [deeloEmbed('🎫 Ticket Opened', `${interaction.user}, support will be with you shortly.\nUse \`,tickets close\` to close.`)] });
      await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }
  });
}
