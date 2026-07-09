import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed, randomInt, parseDuration } from '../../utils/embeds';
import { getSupabase } from '../../database/supabase';
import { countActiveGiveaways, getGuildPlan } from '../../database';
import { getLimit } from '../../config/plans';
import type { Client, Message, TextChannel } from 'discord.js';

interface GiveawayRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  host_id: string;
  prize: string;
  winners_count: number;
  ends_at: string;
  ended: boolean;
}

async function pickWinnersFromMessage(
  client: Client,
  channelId: string,
  messageId: string,
  winnersCount: number,
): Promise<{ winners: string[]; gwMsg: Message | null }> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || channel.isDMBased()) return { winners: [], gwMsg: null };
  const gwMsg = await channel.messages.fetch(messageId).catch(() => null);
  if (!gwMsg) return { winners: [], gwMsg: null };

  const reaction = gwMsg.reactions.cache.get('🎉') ?? (await gwMsg.reactions.resolve('🎉')?.fetch().catch(() => null));
  const users = reaction ? (await reaction.users.fetch()).filter((u) => !u.bot) : new Map();
  const entries = [...users.values()];
  const winners: string[] = [];
  for (let i = 0; i < Math.min(winnersCount, entries.length); i++) {
    const idx = randomInt(0, entries.length - 1 - i);
    winners.push(entries.splice(idx, 1)[0].id);
  }
  return { winners, gwMsg };
}

async function finalizeGiveaway(
  client: Client,
  row: GiveawayRow,
  opts?: { markEnded?: boolean; title?: string },
): Promise<{ winners: string[]; announced: boolean }> {
  const { winners, gwMsg } = await pickWinnersFromMessage(client, row.channel_id, row.message_id, row.winners_count);
  if (opts?.markEnded !== false) {
    await getSupabase().from('giveaways').update({ ended: true }).eq('id', row.id);
  }
  const title = opts?.title ?? '🎉 Giveaway Ended';
  const embed = deeloEmbed(
    title,
    winners.length
      ? `**Winners:** ${winners.map((id) => `<@${id}>`).join(', ')}\n**Prize:** ${row.prize}`
      : `No entries.\n**Prize:** ${row.prize}`,
  );
  if (gwMsg) {
    await gwMsg.reply({ embeds: [embed] }).catch(() => {});
    return { winners, announced: true };
  }
  const channel = await client.channels.fetch(row.channel_id).catch(() => null);
  if (channel?.isTextBased()) {
    await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
    return { winners, announced: true };
  }
  return { winners, announced: false };
}

const giveaways: Command[] = [
  {
    name: 'giveaway',
    aliases: ['gw'],
    description: 'Manage giveaways',
    category: 'giveaways',
    usage: 'giveaway <start|end|reroll|list> ...',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args, client }) => {
      const sub = args[0]?.toLowerCase();

      if (sub === 'start') {
        const duration = args[1];
        const winners = parseInt(args[2] ?? '1', 10);
        const prize = args.slice(3).join(' ');
        if (!duration || !prize) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,giveaway start <1d|1h> <winners> <prize>`')] });
        }

        const ms = parseDuration(duration);
        if (!ms) return void message.reply({ embeds: [errorEmbed('Invalid duration. Use 1m, 1h, 1d, etc.')] });

        const count = await countActiveGiveaways(message.guild!.id);
        const plan = await getGuildPlan(message.guild!.id);
        if (count >= getLimit(plan, 'maxConcurrentGiveaways')) {
          return void message.reply({ embeds: [errorEmbed('Giveaway limit reached for your plan.')] });
        }

        const endsAt = new Date(Date.now() + ms).toISOString();
        const embed = deeloEmbed(
          '🎁 Giveaway',
          `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor((Date.now() + ms) / 1000)}:R>\n\nReact with 🎉 to enter!`,
        );
        if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
        const gwMsg = await message.channel.send({ embeds: [embed] });
        await gwMsg.react('🎉');

        const { data } = await getSupabase()
          .from('giveaways')
          .insert({
            guild_id: message.guild!.id,
            channel_id: message.channel.id,
            message_id: gwMsg.id,
            host_id: message.author.id,
            prize,
            winners_count: winners,
            ends_at: endsAt,
          })
          .select('id')
          .single();

        const giveawayId = data!.id;
        setTimeout(async () => {
          const { data: row } = await getSupabase()
            .from('giveaways')
            .select('*')
            .eq('id', giveawayId)
            .maybeSingle();
          if (!row || row.ended) return;
          await finalizeGiveaway(client, row as GiveawayRow);
        }, ms);

        await message.reply({ embeds: [successEmbed(`Giveaway started! ID: **${giveawayId}**`)] });
        return;
      }

      if (sub === 'list') {
        const { data } = await getSupabase()
          .from('giveaways')
          .select('id, prize, winners_count, ends_at, ended')
          .eq('guild_id', message.guild!.id)
          .eq('ended', false)
          .order('id', { ascending: false })
          .limit(10);
        const lines = (data ?? []).map(
          (g) => `**#${g.id}** · ${g.prize} · ${g.winners_count} winner(s) · ends <t:${Math.floor(new Date(g.ends_at).getTime() / 1000)}:R>`,
        );
        return void message.reply({
          embeds: [deeloEmbed('Active giveaways', lines.join('\n') || '*None.*')],
        });
      }

      if (sub === 'end') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,giveaway end <id>`')] });
        const { data: row } = await getSupabase()
          .from('giveaways')
          .select('*')
          .eq('id', id)
          .eq('guild_id', message.guild!.id)
          .maybeSingle();
        if (!row) return void message.reply({ embeds: [errorEmbed('Giveaway not found.')] });
        if (row.ended) return void message.reply({ embeds: [errorEmbed('That giveaway already ended.')] });
        await finalizeGiveaway(client, row as GiveawayRow);
        return void message.reply({ embeds: [successEmbed(`Giveaway **#${id}** ended.`)] });
      }

      if (sub === 'reroll') {
        const id = parseInt(args[1], 10);
        if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,giveaway reroll <id>`')] });
        const { data: row } = await getSupabase()
          .from('giveaways')
          .select('*')
          .eq('id', id)
          .eq('guild_id', message.guild!.id)
          .maybeSingle();
        if (!row) return void message.reply({ embeds: [errorEmbed('Giveaway not found.')] });
        if (!row.ended) {
          return void message.reply({ embeds: [errorEmbed('End the giveaway first with `,giveaway end <id>`.')] });
        }
        await finalizeGiveaway(client, row as GiveawayRow, { markEnded: false, title: '🎉 Giveaway Reroll' });
        return void message.reply({ embeds: [successEmbed(`Rerolled giveaway **#${id}**.`)] });
      }

      await message.reply({
        embeds: [errorEmbed('Usage: `,giveaway <start|end|reroll|list>`')],
      });
    },
  },
];

export default giveaways;
