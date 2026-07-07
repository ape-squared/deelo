import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getGuild, updateGuild } from '../../database';

const security: Command[] = [
  {
    name: 'antinuke',
    description: 'Configure anti-nuke protection',
    category: 'security',
    usage: 'antinuke <enable|disable|threshold> [value]',
    permissions: [PermissionFlagsBits.Administrator],
    premiumFeature: 'antinuke',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'enable') {
        await updateGuild(message.guild!.id, { antinuke_enabled: true });
        return void message.reply({ embeds: [successEmbed('Anti-nuke **enabled**.')] });
      }
      if (sub === 'disable') {
        await updateGuild(message.guild!.id, { antinuke_enabled: false });
        return void message.reply({ embeds: [successEmbed('Anti-nuke **disabled**.')] });
      }
      if (sub === 'threshold') {
        const val = parseInt(args[1], 10);
        if (!val) return void message.reply({ embeds: [errorEmbed('Usage: `,antinuke threshold <number>`')] });
        await updateGuild(message.guild!.id, { antinuke_threshold: val });
        return void message.reply({ embeds: [successEmbed(`Anti-nuke threshold set to **${val}** actions/minute.`)] });
      }
      const guild = await getGuild(message.guild!.id);
      await message.reply({
        embeds: [deeloEmbed('Anti-Nuke', `**Status:** ${guild.antinuke_enabled ? 'Enabled' : 'Disabled'}\n**Threshold:** ${guild.antinuke_threshold}/min`)],
      });
    },
  },
  {
    name: 'antiraid',
    description: 'Configure anti-raid protection',
    category: 'security',
    usage: 'antiraid <enable|disable|age|avatar>',
    permissions: [PermissionFlagsBits.Administrator],
    premiumFeature: 'antiraid',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'enable') {
        await updateGuild(message.guild!.id, { antiraid_enabled: true });
        return void message.reply({ embeds: [successEmbed('Anti-raid **enabled**.')] });
      }
      if (sub === 'disable') {
        await updateGuild(message.guild!.id, { antiraid_enabled: false });
        return void message.reply({ embeds: [successEmbed('Anti-raid **disabled**.')] });
      }
      if (sub === 'age') {
        const days = parseInt(args[1], 10);
        if (!days) return void message.reply({ embeds: [errorEmbed('Usage: `,antiraid age <days>`')] });
        await updateGuild(message.guild!.id, { antiraid_min_age: days });
        return void message.reply({ embeds: [successEmbed(`Minimum account age set to **${days}** days.`)] });
      }
      if (sub === 'avatar') {
        await updateGuild(message.guild!.id, { antiraid_avatar: true });
        return void message.reply({ embeds: [successEmbed('Avatar check **enabled**.')] });
      }
      const guild = await getGuild(message.guild!.id);
      await message.reply({
        embeds: [deeloEmbed('Anti-Raid', `**Status:** ${guild.antiraid_enabled ? 'Enabled' : 'Disabled'}\n**Min age:** ${guild.antiraid_min_age}d\n**Avatar check:** ${guild.antiraid_avatar ? 'Yes' : 'No'}`)],
      });
    },
  },
  {
    name: 'automod',
    description: 'Toggle automod',
    category: 'security',
    usage: 'automod <enable|disable>',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'enable') {
        await updateGuild(message.guild!.id, { automod_enabled: true });
        return void message.reply({ embeds: [successEmbed('Automod **enabled**.')] });
      }
      if (sub === 'disable') {
        await updateGuild(message.guild!.id, { automod_enabled: false });
        return void message.reply({ embeds: [successEmbed('Automod **disabled**.')] });
      }
      const guild = await getGuild(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('Automod', `**Status:** ${guild.automod_enabled ? 'Enabled' : 'Disabled'}`)] });
    },
  },
  {
    name: 'filter',
    description: 'Manage word/link filters',
    category: 'security',
    usage: 'filter <add|remove|list> [type] [value]',
    permissions: [PermissionFlagsBits.ManageGuild],
    premiumFeature: 'advancedFilters',
    run: async ({ message, args }) => {
      const { getSupabase } = await import('../../database/supabase');
      const { countFilters, getGuildPlan } = await import('../../database');
      const { getLimit } = await import('../../config/plans');
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        const { data } = await getSupabase().from('filters').select('*').eq('guild_id', message.guild!.id);
        const list = data?.map((f) => `**${f.type}:** \`${f.value}\` (${f.action})`).join('\n') || 'No filters.';
        return void message.reply({ embeds: [deeloEmbed('Filters', list)] });
      }

      if (sub === 'add') {
        const type = args[1];
        const value = args.slice(2).join(' ');
        if (!type || !value) return void message.reply({ embeds: [errorEmbed('Usage: `,filter add <word|link|invite> <value>`')] });
        const count = await countFilters(message.guild!.id);
        const plan = await getGuildPlan(message.guild!.id);
        if (count >= getLimit(plan, 'maxFilters')) {
          return void message.reply({ embeds: [errorEmbed('Filter limit reached. Upgrade for more.')] });
        }
        await getSupabase().from('filters').insert({ guild_id: message.guild!.id, type, value });
        return void message.reply({ embeds: [successEmbed(`Added **${type}** filter: \`${value}\``)] });
      }

      if (sub === 'remove') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,filter remove <id>`')] });
        await getSupabase().from('filters').delete().eq('id', id).eq('guild_id', message.guild!.id);
        return void message.reply({ embeds: [successEmbed('Filter removed.')] });
      }

      await message.reply({ embeds: [errorEmbed('Usage: `,filter <add|remove|list>`')] });
    },
  },
  {
    name: 'fakepermissions',
    aliases: ['fakeperms'],
    description: 'Restrict mods to use Deelo for moderation only',
    category: 'security',
    usage: 'fakepermissions <enable|disable>',
    permissions: [PermissionFlagsBits.Administrator],
    premiumFeature: 'fakePermissions',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'enable') {
        await updateGuild(message.guild!.id, { fake_permissions_enabled: true });
        return void message.reply({ embeds: [successEmbed('Fake permissions **enabled**. Moderators must use Deelo commands.')] });
      }
      if (sub === 'disable') {
        await updateGuild(message.guild!.id, { fake_permissions_enabled: false });
        return void message.reply({ embeds: [successEmbed('Fake permissions **disabled**.')] });
      }
      const guild = await getGuild(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('Fake Permissions', `**Status:** ${guild.fake_permissions_enabled ? 'Enabled' : 'Disabled'}`)] });
    },
  },
];

export default security;
