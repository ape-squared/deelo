import type { Command } from '../../types/command';
import { isBotOwner } from '../../services/platform-staff';
import { deeloEmbed } from '../../utils/embeds';
import { syncOfficialEmbedsToGuild } from '../../services/deelo-server-setup';
import { DEFAULT_OFFICIAL_GUILD_ID } from '../../lib/official-server-embeds';

const deelorunCommands: Command[] = [
  {
    name: 'deelorun',
    aliases: ['deelosetup', 'officialsetup'],
    description: 'Sync official Deelo server embeds from the admin CMS',
    category: 'config',
    usage: 'deelorun [update|sync]',
    ownerOnly: true,
    run: async ({ message, args }) => {
      if (!message.guild) {
        await message.reply({ embeds: [deeloEmbed('Deelo run', 'Use this in a server.')] });
        return;
      }

      if (message.guild.id !== DEFAULT_OFFICIAL_GUILD_ID && !isBotOwner(message.author.id)) {
        await message.reply({
          embeds: [deeloEmbed('Deelo run', 'This command is for the official Deelo server only.')],
        });
        return;
      }

      const sub = args[0]?.toLowerCase();
      if (sub && sub !== 'update' && sub !== 'sync') {
        await message.reply({
          embeds: [deeloEmbed('Deelo run', 'Usage: `,deelorun update` — refreshes #rules, #bot-help, and other CMS embeds.')],
        });
        return;
      }

      const status = await message.reply({
        embeds: [deeloEmbed('Deelo run', 'Syncing official server embeds from CMS…')],
      });

      const lines = await syncOfficialEmbedsToGuild(message.guild);
      const body = lines.length
        ? lines.map((l) => `${l.ok ? '✓' : '✗'} **#${l.channel}**${l.error ? ` — ${l.error}` : ''}`).join('\n')
        : 'No channel embeds configured.';

      await status.edit({ embeds: [deeloEmbed('Deelo run — sync complete', body)] });
    },
  },
];

export default deelorunCommands;
