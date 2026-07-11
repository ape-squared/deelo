import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getGuild, updateGuild, getPrefix, toggleEvent } from '../../database';
import { WELCOME_VARIABLES, formatGuildMessageForUser } from '../../lib/welcome-format';
import {
  addGuildMessage,
  getGuildMessage,
  listGuildMessages,
  removeGuildMessage,
} from '../../services/guild-messages';

const configCommands: Command[] = [
  {
    name: 'prefix',
    description: 'View or change the server prefix',
    category: 'config',
    usage: 'prefix [set <prefix>]',
    permissions: [PermissionFlagsBits.ManageGuild],
    ack: 'only',
    run: async ({ message, args }) => {
      if (args[0]?.toLowerCase() === 'set' && args[1]) {
        const { getGuildPlan } = await import('../../database');
        const { hasFeature } = await import('../../config/plans');
        const plan = await getGuildPlan(message.guild!.id);
        if (args[1] !== ',' && !hasFeature(plan, 'customPrefix')) {
          return void message.reply({ embeds: [errorEmbed('Custom prefix requires Premium. Use the dashboard or upgrade at deelo.bot/pricing')] });
        }
        await updateGuild(message.guild!.id, { prefix: args[1] });
        return;
      }
      const prefix = await getPrefix(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('Prefix', `Current prefix: \`${prefix}\`\nChange with \`${prefix}prefix set <new>\``)] });
    },
  },
  {
    name: 'welcome',
    description: 'Configure welcome messages',
    category: 'config',
    usage: 'welcome <channel|message|add|list|remove|view|variables|test>',
    permissions: [PermissionFlagsBits.ManageGuild],
    ack: 'only',
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'variables' || sub === 'vars') {
        return void message.reply({
          embeds: [deeloEmbed('Welcome variables', `Use these in your message:\n${WELCOME_VARIABLES}`)],
        });
      }

      if (sub === 'add' || sub === 'create' || sub === 'set') {
        const ch = message.mentions.channels.first();
        const textArgs = ch ? args.slice(2) : args.slice(1);
        const msg = textArgs.join(' ');
        const channelId = ch?.id ?? message.channel.id;
        if (!msg) {
          return void message.reply({
            embeds: [errorEmbed('Usage: `,welcome add #channel <message>` or `,welcome add <message>` in the target channel')],
          });
        }
        const row = await addGuildMessage(guildId, 'welcome', channelId, msg);
        return void message.reply({
          embeds: [successEmbed(`Welcome message **#${row.id}** added for <#${channelId}>.`)],
        });
      }

      if (sub === 'list') {
        const rows = await listGuildMessages(guildId, 'welcome');
        const guild = await getGuild(guildId);
        const lines: string[] = [];
        if (guild.welcome_channel && guild.welcome_message) {
          lines.push(`**primary** · <#${guild.welcome_channel}> · ${guild.welcome_message.slice(0, 80)}`);
        }
        for (const row of rows) {
          lines.push(`**#${row.id}** · <#${row.channel_id}> · ${row.message.slice(0, 80)}`);
        }
        return void message.reply({
          embeds: [deeloEmbed('Welcome messages', lines.join('\n') || '*No welcome messages configured.*')],
        });
      }

      if (sub === 'remove' || sub === 'delete' || sub === 'del') {
        const id = parseInt(args[1] ?? '', 10);
        if (!id) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,welcome remove <id>` — use `,welcome list` for IDs')] });
        }
        const ok = await removeGuildMessage(guildId, id);
        return void message.reply({
          embeds: [ok ? successEmbed(`Removed welcome message **#${id}**.`) : errorEmbed(`No welcome message with ID **${id}**.`)],
        });
      }

      if (sub === 'view' || sub === 'check') {
        const id = parseInt(args[1] ?? '', 10);
        if (id) {
          const row = await getGuildMessage(guildId, id);
          if (!row || row.kind !== 'welcome') {
            return void message.reply({ embeds: [errorEmbed(`No welcome message with ID **${id}**.`)] });
          }
          return void message.reply({
            embeds: [deeloEmbed(`Welcome #${row.id}`, `**Channel:** <#${row.channel_id}>\n**Message:** ${row.message}`)],
          });
        }
        const guild = await getGuild(guildId);
        return void message.reply({
          embeds: [deeloEmbed('Welcome (primary)', `**Channel:** ${guild.welcome_channel ? `<#${guild.welcome_channel}>` : 'None'}\n**Message:** ${guild.welcome_message ?? 'None'}`)],
        });
      }

      if (sub === 'channel') {
        const ch = message.mentions.channels.first();
        if (!ch) return void message.reply({ embeds: [errorEmbed('Mention a channel.')] });
        await updateGuild(message.guild!.id, { welcome_channel: ch.id });
        return;
      }
      if (sub === 'message') {
        const msg = args.slice(1).join(' ');
        if (!msg) return void message.reply({ embeds: [errorEmbed('Usage: `,welcome message <text>`\nVariables: {user}, {user.name}, {server}, {membercount}')] });
        await updateGuild(message.guild!.id, { welcome_message: msg });
        return;
      }
      if (sub === 'test') {
        const guild = await getGuild(guildId);
        const rows = await listGuildMessages(guildId, 'welcome');
        const template = rows[0]?.message ?? guild.welcome_message;
        if (!template) return void message.reply({ embeds: [errorEmbed('No welcome message set.')] });
        const msg = formatGuildMessageForUser(template, message.author, message.guild!);
        return void message.reply({ content: msg });
      }
      const guild = await getGuild(guildId);
      const rows = await listGuildMessages(guildId, 'welcome');
      await message.reply({
        embeds: [
          deeloEmbed(
            'Welcome',
            [
              `**Primary channel:** ${guild.welcome_channel ? `<#${guild.welcome_channel}>` : 'None'}`,
              `**Primary message:** ${guild.welcome_message ?? 'None'}`,
              `**Extra messages:** ${rows.length}`,
              '',
              '**Add:** `,welcome add #channel <message>`',
              '**List:** `,welcome list`',
            ].join('\n'),
          ),
        ],
      });
    },
  },
  {
    name: 'goodbye',
    description: 'Configure goodbye messages',
    category: 'config',
    usage: 'goodbye <channel|message|add|list|remove|view|variables>',
    permissions: [PermissionFlagsBits.ManageGuild],
    ack: 'only',
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'variables' || sub === 'vars') {
        return void message.reply({
          embeds: [deeloEmbed('Goodbye variables', `Use these in your message:\n${WELCOME_VARIABLES}`)],
        });
      }

      if (sub === 'add' || sub === 'create') {
        const ch = message.mentions.channels.first();
        const textArgs = ch ? args.slice(2) : args.slice(1);
        const msg = textArgs.join(' ');
        const channelId = ch?.id ?? message.channel.id;
        if (!msg) {
          return void message.reply({
            embeds: [errorEmbed('Usage: `,goodbye add #channel <message>` or `,goodbye add <message>` in the target channel')],
          });
        }
        const row = await addGuildMessage(guildId, 'goodbye', channelId, msg);
        return void message.reply({
          embeds: [successEmbed(`Goodbye message **#${row.id}** added for <#${channelId}>.`)],
        });
      }

      if (sub === 'list') {
        const rows = await listGuildMessages(guildId, 'goodbye');
        const guild = await getGuild(guildId);
        const lines: string[] = [];
        if (guild.goodbye_channel && guild.goodbye_message) {
          lines.push(`**primary** · <#${guild.goodbye_channel}> · ${guild.goodbye_message.slice(0, 80)}`);
        }
        for (const row of rows) {
          lines.push(`**#${row.id}** · <#${row.channel_id}> · ${row.message.slice(0, 80)}`);
        }
        return void message.reply({
          embeds: [deeloEmbed('Goodbye messages', lines.join('\n') || '*No goodbye messages configured.*')],
        });
      }

      if (sub === 'remove' || sub === 'delete' || sub === 'del') {
        const id = parseInt(args[1] ?? '', 10);
        if (!id) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,goodbye remove <id>`')] });
        }
        const ok = await removeGuildMessage(guildId, id);
        return void message.reply({
          embeds: [ok ? successEmbed(`Removed goodbye message **#${id}**.`) : errorEmbed(`No goodbye message with ID **${id}**.`)],
        });
      }

      if (sub === 'view' || sub === 'check') {
        const id = parseInt(args[1] ?? '', 10);
        if (id) {
          const row = await getGuildMessage(guildId, id);
          if (!row || row.kind !== 'goodbye') {
            return void message.reply({ embeds: [errorEmbed(`No goodbye message with ID **${id}**.`)] });
          }
          return void message.reply({
            embeds: [deeloEmbed(`Goodbye #${row.id}`, `**Channel:** <#${row.channel_id}>\n**Message:** ${row.message}`)],
          });
        }
        const guild = await getGuild(guildId);
        return void message.reply({
          embeds: [deeloEmbed('Goodbye (primary)', `**Channel:** ${guild.goodbye_channel ? `<#${guild.goodbye_channel}>` : 'None'}\n**Message:** ${guild.goodbye_message ?? 'None'}`)],
        });
      }

      if (sub === 'channel') {
        const ch = message.mentions.channels.first();
        if (!ch) return void message.reply({ embeds: [errorEmbed('Mention a channel.')] });
        await updateGuild(message.guild!.id, { goodbye_channel: ch.id });
        return;
      }
      if (sub === 'message') {
        const msg = args.slice(1).join(' ');
        if (!msg) return void message.reply({ embeds: [errorEmbed('Usage: `,goodbye message <text>`')] });
        await updateGuild(message.guild!.id, { goodbye_message: msg });
        return;
      }
      const guild = await getGuild(guildId);
      const rows = await listGuildMessages(guildId, 'goodbye');
      await message.reply({
        embeds: [
          deeloEmbed(
            'Goodbye',
            [
              `**Primary channel:** ${guild.goodbye_channel ? `<#${guild.goodbye_channel}>` : 'None'}`,
              `**Primary message:** ${guild.goodbye_message ?? 'None'}`,
              `**Extra messages:** ${rows.length}`,
              '',
              '**Add:** `,goodbye add #channel <message>`',
              '**List:** `,goodbye list`',
            ].join('\n'),
          ),
        ],
      });
    },
  },
  {
    name: 'autorole',
    description: 'Set auto-role for new members',
    category: 'config',
    usage: 'autorole <role>',
    permissions: [PermissionFlagsBits.ManageRoles],
    ack: 'only',
    run: async ({ message, args }) => {
      const role = message.mentions.roles.first();
      if (!role) return void message.reply({ embeds: [errorEmbed('Mention a role.')] });
      await updateGuild(message.guild!.id, { autorole: role.id });
    },
  },
  {
    name: 'modlog',
    description: 'Set moderation log channel',
    category: 'config',
    usage: 'modlog <channel>',
    permissions: [PermissionFlagsBits.ManageGuild],
    premiumFeature: 'logging',
    ack: 'only',
    run: async ({ message, args }) => {
      const ch = message.mentions.channels.first();
      if (!ch) return void message.reply({ embeds: [errorEmbed('Mention a channel.')] });
      await updateGuild(message.guild!.id, { mod_log_channel: ch.id });
      const { setLogChannel } = await import('../../services/logging');
      await setLogChannel(message.guild!.id, 'moderation', ch.id);
    },
  },
  {
    name: 'event',
    description: 'Toggle bot events',
    category: 'config',
    usage: 'event <name> <on|off>',
    permissions: [PermissionFlagsBits.ManageGuild],
    ack: 'only',
    run: async ({ message, args }) => {
      const name = args[0]?.toLowerCase();
      const state = args[1]?.toLowerCase();
      if (!name || !['on', 'off'].includes(state ?? '')) {
        return void message.reply({ embeds: [deeloEmbed('Events', 'Available: `snipe`, `afk`, `levels`, `autoresponder`, `reactiontrigger`\nUsage: `,event <name> <on|off>`')] });
      }
      await toggleEvent(message.guild!.id, name, state === 'on');
      if (name === 'snipe' || name === 'levels') {
        await updateGuild(message.guild!.id, { [`${name}_enabled`]: state === 'on' });
      }
    },
  },
  {
    name: 'responder',
    aliases: ['autoresponder', 'ar'],
    description: 'Manage auto responders',
    category: 'config',
    usage: 'responder <add|remove|list> [trigger] [response]',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args }) => {
      const { getSupabase } = await import('../../database/supabase');
      const { countAutoResponders, getGuildPlan } = await import('../../database');
      const { getLimit } = await import('../../config/plans');
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const { data } = await getSupabase().from('auto_responders').select('*').eq('guild_id', message.guild!.id);
        const list = data?.map((r) => `**${r.id}.** \`${r.trigger}\` → ${r.response}`).join('\n') || 'None.';
        return void message.reply({ embeds: [deeloEmbed('Auto Responders', list)] });
      }
      if (sub === 'add') {
        const trigger = args[1];
        const response = args.slice(2).join(' ');
        if (!trigger || !response) return void message.reply({ embeds: [errorEmbed('Usage: `,responder add <trigger> <response>`')] });
        const count = await countAutoResponders(message.guild!.id);
        const plan = await getGuildPlan(message.guild!.id);
        if (count >= getLimit(plan, 'maxAutoResponders')) return void message.reply({ embeds: [errorEmbed('Responder limit reached.')] });
        await getSupabase().from('auto_responders').insert({ guild_id: message.guild!.id, trigger, response });
        return void message.reply({ embeds: [successEmbed(`Added responder for \`${trigger}\``)] });
      }
      if (sub === 'remove') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,responder remove <id>`')] });
        await getSupabase().from('auto_responders').delete().eq('id', id).eq('guild_id', message.guild!.id);
        return void message.reply({ embeds: [successEmbed('Responder removed.')] });
      }
      await message.reply({ embeds: [errorEmbed('Usage: `,responder <add|remove|list>`')] });
    },
  },
  {
    name: 'autoreact',
    aliases: ['reactiontrigger', 'rt', 'reaction'],
    description: 'Auto-react to messages matching triggers',
    category: 'config',
    usage: 'autoreact <add|remove|list> [trigger] [emoji] [match]',
    permissions: [PermissionFlagsBits.ManageGuild],
    premiumFeature: 'reactionTriggers',
    run: async ({ message, args }) => {
      const { getSupabase } = await import('../../database/supabase');
      const { countReactionTriggers, getGuildPlan } = await import('../../database');
      const { getLimit } = await import('../../config/plans');
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const { data } = await getSupabase().from('reaction_triggers').select('*').eq('guild_id', message.guild!.id).order('id');
        const list = data?.map((r) => `**${r.id}.** \`${r.trigger}\` → ${r.emoji} (${r.match_type ?? 'contains'})`).join('\n') || 'None.';
        return void message.reply({ embeds: [deeloEmbed('Auto Reactions', list)] });
      }

      if (sub === 'add') {
        const trigger = args[1];
        const emoji = args[2];
        const matchType = args[3]?.toLowerCase();
        if (!trigger || !emoji) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,autoreact add <trigger> <emoji> [exact|contains|startswith]`')] });
        }
        const validMatch = ['exact', 'contains', 'startswith'];
        const match_type = validMatch.includes(matchType ?? '') ? matchType! : 'contains';
        const count = await countReactionTriggers(message.guild!.id);
        const plan = await getGuildPlan(message.guild!.id);
        if (count >= getLimit(plan, 'maxReactionTriggers')) {
          return void message.reply({ embeds: [errorEmbed('Auto-react limit reached.')] });
        }
        await getSupabase().from('reaction_triggers').insert({
          guild_id: message.guild!.id,
          trigger,
          emoji,
          match_type,
        });
        return void message.reply({ embeds: [successEmbed(`Added auto-react: \`${trigger}\` → ${emoji} (${match_type})`)] });
      }

      if (sub === 'remove') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,autoreact remove <id>`')] });
        await getSupabase().from('reaction_triggers').delete().eq('id', id).eq('guild_id', message.guild!.id);
        return void message.reply({ embeds: [successEmbed('Auto-react removed.')] });
      }

      await message.reply({
        embeds: [errorEmbed('Usage: `,autoreact <add|remove|list>`\nExample: `,autoreact add hello 👋 contains`')],
      });
    },
  },
  {
    name: 'settings',
    aliases: ['config', 'setup'],
    description: 'View server configuration summary',
    category: 'config',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message }) => {
      const guild = await getGuild(message.guild!.id);
      const prefix = guild.prefix || ',';
      const lines = [
        `**Plan:** ${guild.plan.replace('_', ' ')}${guild.plan_expires_at ? ` (expires <t:${Math.floor(new Date(guild.plan_expires_at).getTime() / 1000)}:R>)` : ''}`,
        `**Prefix:** \`${prefix}\``,
        `**Welcome:** ${guild.welcome_channel ? `<#${guild.welcome_channel}>` : 'off'}`,
        `**Levels:** ${guild.levels_enabled ? 'on' : 'off'} · **Economy:** ${guild.economy_enabled ? 'on' : 'off'} · **Snipe:** ${guild.snipe_enabled ? 'on' : 'off'}`,
        `**Automod:** ${guild.automod_enabled ? 'on' : 'off'} · **Anti-raid:** ${guild.antiraid_enabled ? 'on' : 'off'}`,
        `**Anti-nuke:** ${guild.antinuke_enabled ? 'on' : 'off'} · **Starboard:** ${guild.starboard_channel ? `<#${guild.starboard_channel}>` : 'off'}`,
        `**Voicemaster:** ${guild.voicemaster_join_channel ? `<#${guild.voicemaster_join_channel}>` : 'off'}`,
        `**Auto-react:** \`${prefix}autoreact list\``,
        '',
        `Edit everything at **deelo.bot/dashboard** or use \`${prefix}help config\``,
      ];
      await message.reply({ embeds: [deeloEmbed('⚙️ Server Settings', lines.join('\n'))] });
    },
  },
];

export default configCommands;
