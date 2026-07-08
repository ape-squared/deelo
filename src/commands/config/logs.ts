import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import {
  LOG_EVENTS,
  listLogChannels,
  listLogEventColors,
  removeLogChannel,
  setLogChannel,
  setLogEventColor,
} from '../../services/logging';
import { getConfigValue, setExtraConfig } from '../../extended/lib/guild-config';

async function listIgnored(guildId: string): Promise<string[]> {
  const ignored = await getConfigValue<Record<string, boolean>>(guildId, 'logs.ignore');
  if (!ignored || typeof ignored !== 'object') return [];
  return Object.keys(ignored);
}

const logsCommands: Command[] = [
  {
    name: 'log',
    aliases: ['logs', 'logging', 'logger'],
    description: 'Configure server event logging channels',
    category: 'config',
    usage: 'log | log add <#channel> <event> | log remove <#channel> <event> | log ignore <user|#channel>',
    permissions: [PermissionFlagsBits.ManageGuild],
    ack: 'only',
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (!sub) {
        const entries = await listLogChannels(guildId);
        const lines = entries.map((e) => `**${e.event}:** <#${e.channelId}>`);
        const events = LOG_EVENTS.map((e) => `\`${e}\``).join(', ');
        await message.reply({
          embeds: [
            deeloEmbed(
              'Server Logs',
              [
                lines.length ? lines.join('\n') : '*No log channels configured.*',
                '',
                `**Events:** ${events}`,
                '',
                '**Setup:** `,log add #channel moderation`',
                '**Mod log:** also `,modlog #channel`',
              ].join('\n'),
            ),
          ],
        });
        return;
      }

      if (sub === 'add' || sub === 'set') {
        const ch = message.mentions.channels.first();
        const event = (args[2] ?? args[1])?.toLowerCase();
        if (!ch || !event) {
          return void message.reply({
            embeds: [errorEmbed('Usage: `,log add #channel <event>`\nEvents: ' + LOG_EVENTS.join(', '))],
          });
        }
        if (!(LOG_EVENTS as readonly string[]).includes(event) && event !== 'mod') {
          return void message.reply({
            embeds: [errorEmbed(`Unknown event \`${event}\`. Events: ${LOG_EVENTS.join(', ')}`)],
          });
        }
        await setLogChannel(guildId, event, ch.id);
        return;
      }

      if (sub === 'remove' || sub === 'delete') {
        const ch = message.mentions.channels.first();
        const event = (args[2] ?? args[1])?.toLowerCase();
        if (!event) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,log remove #channel <event>`')] });
        }
        const ok = await removeLogChannel(guildId, event, ch?.id);
        if (!ok) return void message.reply({ embeds: [errorEmbed('That log channel is not configured for that event.')] });
        return;
      }

      if (sub === 'ignore') {
        if (args[1]?.toLowerCase() === 'list') {
          const list = await listIgnored(guildId);
          return void message.reply({
            embeds: [deeloEmbed('Log Ignores', list.map((id) => `<@${id}>`).join('\n') || 'None.')],
          });
        }
        const target = message.mentions.users.first()?.id ?? message.mentions.channels.first()?.id ?? args[1];
        if (!target) return void message.reply({ embeds: [errorEmbed('Usage: `,log ignore @user` or `,log ignore #channel`')] });
        await setExtraConfig(guildId, `logs.ignore.${target}`, true);
        return;
      }

      if (sub === 'color') {
        const action = args[1]?.toLowerCase();
        if (action === 'list' || !action) {
          const colors = await listLogEventColors(guildId);
          const lines = colors.map((c) => `**${c.event}:** ${c.color}`);
          return void message.reply({
            embeds: [
              deeloEmbed(
                'Log embed colors',
                [
                  lines.length ? lines.join('\n') : '*No custom colors — using default Deelo blue.*',
                  '',
                  '**Set:** `,log color <event> #RRGGBB`',
                  '**Reset:** `,log color reset <event>`',
                ].join('\n'),
              ),
            ],
          });
        }
        if (action === 'reset' || action === 'clear') {
          const event = args[2]?.toLowerCase();
          if (!event || !(LOG_EVENTS as readonly string[]).includes(event)) {
            return void message.reply({ embeds: [errorEmbed('Usage: `,log color reset <event>`')] });
          }
          await setLogEventColor(guildId, event, null);
          await message.reply({ embeds: [deeloEmbed('Log color reset', `**${event}** logs will use the default color.`)] });
          return;
        }
        const event = action;
        const colorArg = args[2]?.replace(/^#/, '');
        if (!(LOG_EVENTS as readonly string[]).includes(event) || !colorArg) {
          return void message.reply({
            embeds: [errorEmbed('Usage: `,log color <event> #RRGGBB`\nEvents: ' + LOG_EVENTS.join(', '))],
          });
        }
        try {
          await setLogEventColor(guildId, event, colorArg);
          await message.reply({ embeds: [deeloEmbed('Log color set', `**${event}** logs will use **#${colorArg.toUpperCase()}**.`)] });
        } catch (err) {
          await message.reply({ embeds: [errorEmbed(err instanceof Error ? err.message : 'Invalid color.')] });
        }
        return;
      }

      // ,logs moderation #channel shorthand
      const ch = message.mentions.channels.first();
      if (ch && ((LOG_EVENTS as readonly string[]).includes(sub) || sub === 'mod')) {
        await setLogChannel(guildId, sub, ch.id);
        return;
      }

      await message.reply({
        embeds: [errorEmbed('Usage: `,logs` · `,log add #channel moderation` · `,log ignore @user`')],
      });
    },
  },
];

export default logsCommands;
