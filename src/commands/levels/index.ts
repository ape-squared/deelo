import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getMemberXp, updateGuild, getGuild } from '../../database';
import { xpForLevel } from '../../utils/embeds';
import { getSupabase } from '../../database/supabase';

const levels: Command[] = [
  {
    name: 'rank',
    aliases: ['level', 'xp'],
    description: 'View your or a member rank',
    category: 'levels',
    usage: 'rank [user]',
    run: async ({ message, args }) => {
      const userId = message.mentions.users.first()?.id ?? args[0] ?? message.author.id;
      const data = await getMemberXp(message.guild!.id, userId);
      const nextLevelXp = xpForLevel(data.level + 1);
      const currentLevelXp = xpForLevel(data.level);
      const progress = Math.floor(((data.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
      await message.reply({
        embeds: [deeloEmbed(`Rank — <@${userId}>`, `**Level:** ${data.level}\n**XP:** ${data.xp}\n**Messages:** ${data.messages}\n**Progress:** ${progress}% to Level ${data.level + 1}`)],
      });
    },
  },
  {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'View the XP leaderboard',
    category: 'levels',
    usage: 'leaderboard',
    run: async ({ message }) => {
      const { data, error } = await getSupabase()
        .from('member_xp')
        .select('*')
        .eq('guild_id', message.guild!.id)
        .order('xp', { ascending: false })
        .limit(10);
      if (error || !data?.length) return void message.reply({ embeds: [deeloEmbed('Leaderboard', 'No data yet.')] });
      const list = data.map((m, i) => `**${i + 1}.** <@${m.user_id}> — Level ${m.level} (${m.xp} XP)`).join('\n');
      await message.reply({ embeds: [deeloEmbed('🏆 Leaderboard', list)] });
    },
  },
  {
    name: 'levels',
    description: 'Configure the leveling system',
    category: 'levels',
    usage: 'levels <enable|disable|channel|multiplier>',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'enable') {
        await updateGuild(message.guild!.id, { levels_enabled: true });
        return void message.reply({ embeds: [successEmbed('Levels **enabled**.')] });
      }
      if (sub === 'disable') {
        await updateGuild(message.guild!.id, { levels_enabled: false });
        return void message.reply({ embeds: [successEmbed('Levels **disabled**.')] });
      }
      if (sub === 'channel') {
        const ch = message.mentions.channels.first();
        if (!ch) return void message.reply({ embeds: [errorEmbed('Mention a channel.')] });
        await updateGuild(message.guild!.id, { levels_channel: ch.id });
        return void message.reply({ embeds: [successEmbed(`Level-up channel set to ${ch}.`)] });
      }
      if (sub === 'multiplier') {
        const mult = parseFloat(args[1]);
        if (!mult) return void message.reply({ embeds: [errorEmbed('Usage: `,levels multiplier <number>`')] });
        await updateGuild(message.guild!.id, { levels_multiplier: mult });
        return void message.reply({ embeds: [successEmbed(`XP multiplier set to **${mult}x**.`)] });
      }
      const guild = await getGuild(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('Levels', `**Enabled:** ${guild.levels_enabled}\n**Channel:** ${guild.levels_channel ? `<#${guild.levels_channel}>` : 'None'}\n**Multiplier:** ${guild.levels_multiplier}x`)] });
    },
  },
];

export default levels;
