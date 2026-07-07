import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import { getConfigValue, setExtraConfig } from '../../extended/lib/guild-config';

const BRAND_COLOR = 0x0047ff;

const suggestCommands: Command[] = [
  {
    name: 'suggest',
    aliases: ['suggestion', 'idea'],
    description: 'Submit or manage server suggestions',
    category: 'config',
    usage: 'suggest <text> | suggest channel <#channel> | suggest status',
    ack: 'only',
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'channel' || sub === 'set') {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return void message.reply({ embeds: [errorEmbed('You need **Manage Server** to set the suggestion channel.')] });
        }
        const ch = message.mentions.channels.first();
        if (!ch) {
          const current = await getConfigValue<string>(guildId, 'suggest.channel');
          return void message.reply({
            embeds: [
              deeloEmbed(
                'Suggestion channel',
                current
                  ? `Current channel: <#${current}>\n\nSet a new one with \`,suggest channel #channel\``
                  : 'No suggestion channel set.\n\nUse `,suggest channel #channel`',
              ),
            ],
          });
        }
        await setExtraConfig(guildId, 'suggest.channel', ch.id);
        return void message.reply({ embeds: [deeloEmbed('Suggestion channel', `Suggestions will post in ${ch}.`)] });
      }

      if (sub === 'status' || sub === 'config') {
        const chId = await getConfigValue<string>(guildId, 'suggest.channel');
        return void message.reply({
          embeds: [
            deeloEmbed(
              'Suggestions',
              chId
                ? `**Channel:** <#${chId}>\nSubmit with \`,suggest <your idea>\``
                : 'No suggestion channel configured. An admin can set one with `,suggest channel #channel`.',
            ),
          ],
        });
      }

      const text = args.join(' ').trim();
      if (!text || text.length < 4) {
        return void message.reply({
          embeds: [errorEmbed('Usage: `,suggest <your idea>` (min 4 characters)\nAdmins: `,suggest channel #channel`')],
        });
      }
      if (text.length > 2000) {
        return void message.reply({ embeds: [errorEmbed('Suggestions must be under 2000 characters.')] });
      }

      const chId = await getConfigValue<string>(guildId, 'suggest.channel');
      const channel = chId ? message.guild!.channels.cache.get(chId) : null;
      if (!channel?.isTextBased() || channel.isDMBased()) {
        return void message.reply({
          embeds: [errorEmbed('Suggestion channel is not set. Ask an admin to run `,suggest channel #channel`.')],
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('suggest_up').setEmoji('👍').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('suggest_down').setEmoji('👎').setStyle(ButtonStyle.Secondary),
      );

      const embed = deeloEmbed('💡 Suggestion', text);
      embed.setColor(BRAND_COLOR);
      embed.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() });
      embed.setFooter({ text: `User ID: ${message.author.id}` });
      embed.setTimestamp();

      const posted = await channel.send({ embeds: [embed], components: [row] });
      await posted.react('👍').catch(() => {});
      await posted.react('👎').catch(() => {});
      // Success: ack-only (✅ on command message, no extra bot reply)
    },
  },
];

export default suggestCommands;
