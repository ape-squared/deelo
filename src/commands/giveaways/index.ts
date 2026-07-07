import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getSupabase } from '../../database/supabase';
import { countActiveGiveaways, getGuildPlan } from '../../database';
import { getLimit } from '../../config/plans';
import { randomInt } from '../../utils/embeds';

const giveaways: Command[] = [
  {
    name: 'giveaway',
    aliases: ['gw'],
    description: 'Manage giveaways',
    category: 'giveaways',
    usage: 'giveaway <start|end|reroll> ...',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args, client }) => {
      const sub = args[0]?.toLowerCase();

      if (sub === 'start') {
        const duration = args[1];
        const winners = parseInt(args[2] ?? '1', 10);
        const prize = args.slice(3).join(' ');
        if (!duration || !prize) return void message.reply({ embeds: [errorEmbed('Usage: `,giveaway start <1d|1h> <winners> <prize>`')] });

        const { parseDuration } = await import('../../utils/embeds');
        const ms = parseDuration(duration);
        if (!ms) return void message.reply({ embeds: [errorEmbed('Invalid duration. Use 1m, 1h, 1d, etc.')] });

        const count = await countActiveGiveaways(message.guild!.id);
        const plan = await getGuildPlan(message.guild!.id);
        if (count >= getLimit(plan, 'maxConcurrentGiveaways')) {
          return void message.reply({ embeds: [errorEmbed('Giveaway limit reached for your plan.')] });
        }

        const endsAt = new Date(Date.now() + ms).toISOString();
        const embed = deeloEmbed('🎁 Giveaway', `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor((Date.now() + ms) / 1000)}:R>\n\nReact with 🎉 to enter!`);
        if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
        const gwMsg = await message.channel.send({ embeds: [embed] });
        await gwMsg.react('🎉');

        const { data } = await getSupabase()
          .from('giveaways')
          .insert({ guild_id: message.guild!.id, channel_id: message.channel.id, message_id: gwMsg.id, host_id: message.author.id, prize, winners_count: winners, ends_at: endsAt })
          .select('id')
          .single();

        setTimeout(async () => {
          const reaction = gwMsg.reactions.cache.get('🎉');
          const users = reaction ? (await reaction.users.fetch()).filter((u: { bot: boolean }) => !u.bot) : new Map();
          const entries = [...users.values()];
          const picked: string[] = [];
          for (let i = 0; i < Math.min(winners, entries.length); i++) {
            const idx = randomInt(0, entries.length - 1 - i);
            picked.push(entries.splice(idx, 1)[0].id);
          }
          await getSupabase().from('giveaways').update({ ended: true }).eq('id', data!.id);
          await gwMsg.reply({ embeds: [deeloEmbed('🎉 Giveaway Ended', picked.length ? `**Winners:** ${picked.map((id) => `<@${id}>`).join(', ')}\n**Prize:** ${prize}` : 'No entries.')] });
        }, ms);

        await message.reply({ embeds: [successEmbed('Giveaway started!')] });
        return;
      }

      if (sub === 'end') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,giveaway end <id>`')] });
        await getSupabase().from('giveaways').update({ ended: true }).eq('id', id).eq('guild_id', message.guild!.id);
        return void message.reply({ embeds: [successEmbed('Giveaway ended.')] });
      }

      await message.reply({ embeds: [errorEmbed('Usage: `,giveaway <start|end>`')] });
    },
  },
];

export default giveaways;
