import type { DeeloClient } from '../client';
import { EmbedBuilder } from 'discord.js';
import { openTicketFromPanel, resolvePanel } from '../services/tickets';

function parseSuggestionVotes(footerText?: string | null): { authorId: string; up: number; down: number } {
  const text = footerText ?? '';
  const authorId = text.match(/User ID:\s*(\d+)/)?.[1] ?? '0';
  const up = parseInt(text.match(/👍\s*(\d+)/)?.[1] ?? '0', 10);
  const down = parseInt(text.match(/👎\s*(\d+)/)?.[1] ?? '0', 10);
  return { authorId, up, down };
}

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
      if (!interaction.guild) return;

      await interaction.deferReply({ ephemeral: true });

      const panel = await resolvePanel(interaction.guild.id, interaction.customId);
      const panelName = panel?.name ?? interaction.customId.replace('ticket_open_', '');

      const result = await openTicketFromPanel(interaction.guild, interaction.user, panel, panelName);
      if ('error' in result) {
        await interaction.editReply({ content: result.error });
        return;
      }

      await interaction.editReply({ content: `Ticket created: ${result.channel}` });
      return;
    }

    if (interaction.customId.startsWith('suggest_up:') || interaction.customId.startsWith('suggest_down:')) {
      const isUp = interaction.customId.startsWith('suggest_up:');
      const embed = interaction.message.embeds[0];
      if (!embed) {
        await interaction.reply({ content: 'This suggestion is no longer available.', ephemeral: true });
        return;
      }

      const { authorId, up, down } = parseSuggestionVotes(embed.footer?.text);
      if (authorId === interaction.user.id) {
        await interaction.reply({ content: 'You cannot vote on your own suggestion.', ephemeral: true });
        return;
      }

      const voters = client.suggestionVoters.get(interaction.message.id) ?? new Set<string>();
      if (voters.has(interaction.user.id)) {
        await interaction.reply({ content: 'You already voted on this suggestion.', ephemeral: true });
        return;
      }
      voters.add(interaction.user.id);
      client.suggestionVoters.set(interaction.message.id, voters);

      const newUp = isUp ? up + 1 : up;
      const newDown = isUp ? down : down + 1;
      const updated = EmbedBuilder.from(embed).setFooter({
        text: `User ID: ${authorId} · 👍 ${newUp} · 👎 ${newDown}`,
      });

      await interaction.update({ embeds: [updated], components: interaction.message.components });
    }
  });
}
