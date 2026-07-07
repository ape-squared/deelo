import type { Message, PartialMessage, TextChannel } from 'discord.js';
import type { GuildSettings } from '../database';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';
import { deeloEmbed } from '../utils/embeds';

const STAR = '⭐';

export async function handleStarboardReaction(
  message: Message | PartialMessage,
  guild: GuildSettings,
  starCount: number,
): Promise<void> {
  if (!guild.starboard_channel || starCount < guild.starboard_threshold) return;
  if (!message.guild || !message.author || message.author.bot) return;
  if (message.channelId === guild.starboard_channel) return;

  const posted = await getConfigValue<string | null>(message.guild.id, `starboard.posts.${message.id}`, null);
  if (posted) return;

  const board = message.guild.channels.cache.get(guild.starboard_channel);
  if (!board?.isTextBased()) return;

  const content = message.content?.slice(0, 500) || '*No text content*';
  const embed = deeloEmbed(
    `#${(message.channel as TextChannel).name}`,
    `${content}\n\n**${starCount}** ${STAR} · [Jump to message](${message.url})`,
  );

  const sent = await board.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
  }).catch(() => null);

  if (sent) {
    await setExtraConfig(message.guild.id, `starboard.posts.${message.id}`, sent.id);
    await sent.react(STAR).catch(() => {});
  }
}
