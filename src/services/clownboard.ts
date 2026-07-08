import type { Message, PartialMessage, MessageReaction, PartialMessageReaction, TextChannel } from 'discord.js';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';
import { deeloEmbed } from '../utils/embeds';

function reactionMatchesEmoji(reaction: MessageReaction | PartialMessageReaction, configured: string): boolean {
  const emoji = reaction.emoji;
  if (!configured) return false;
  if (emoji.id) {
    return (
      configured === emoji.name
      || configured === `<:${emoji.name}:${emoji.id}>`
      || configured === `<a:${emoji.name}:${emoji.id}>`
      || configured.includes(emoji.id)
    );
  }
  return configured === emoji.name;
}

export async function handleClownboardReaction(
  reaction: MessageReaction | PartialMessageReaction,
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guild || !message.author || message.author.bot) return;

  const guildId = message.guild.id;
  const locked = await getConfigValue<boolean>(guildId, 'clownboard.locked', false);
  if (locked) return;

  const boardChannelId = await getConfigValue<string | null>(guildId, 'clownboard.channel', null);
  if (!boardChannelId) return;
  if (message.channelId === boardChannelId) return;

  const configuredEmoji = String(await getConfigValue(guildId, 'clownboard.emoji', '🤡'));
  if (!reactionMatchesEmoji(reaction, configuredEmoji)) return;

  const threshold = Number(await getConfigValue(guildId, 'clownboard.threshold', 3)) || 3;
  const count = reaction.count ?? 1;
  if (count < threshold) return;

  const posted = await getConfigValue<string | null>(guildId, `clownboard.posts.${message.id}`, null);
  if (posted) return;

  const board = message.guild.channels.cache.get(boardChannelId);
  if (!board?.isTextBased()) return;

  const content = message.content?.slice(0, 500) || '*No text content*';
  const displayEmoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : (reaction.emoji.name ?? configuredEmoji);
  const embed = deeloEmbed(
    `#${(message.channel as TextChannel).name}`,
    `${content}\n\n**${count}** ${displayEmoji} · [Jump to message](${message.url})`,
  );

  const sent = await board.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
  }).catch(() => null);

  if (sent) {
    await setExtraConfig(guildId, `clownboard.posts.${message.id}`, sent.id);
    await sent.react(reaction.emoji).catch(() => {});
  }
}
