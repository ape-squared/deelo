import { AttachmentBuilder, type Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo, deeloEmbed } from '../lib/helpers';
import { generateMediaEffect, MEDIA_EFFECT_NAMES } from '../../services/media-effects';

function resolveImageUrl(message: Message, args: string[]): string | undefined {
  return (
    message.attachments.first()?.url ??
    message.mentions.users.first()?.displayAvatarURL({ extension: 'png', size: 512 }) ??
    args.find((a) => /^https?:\/\//i.test(a))
  );
}

export async function handleManipulationCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'manipulation') return false;
  const name = cmd.name;

  if (name === 'media' && args.length === 0) {
    await replyInfo(
      message,
      'Media',
      `Image effects for avatars and attachments.\n\n**Usage:** \`,media <effect>\` with an image attached, a user mention, or image URL.\n\n**Examples:** \`,media blur\`, \`,media deepfry\`, \`,media magik\`\n\n**Effects:** ${MEDIA_EFFECT_NAMES.slice(0, 18).join(', ')}, …`,
    );
    return true;
  }

  const effect = name.startsWith('media ') ? name.slice('media '.length) : name;
  if (!name.startsWith('media') && !MEDIA_EFFECT_NAMES.includes(effect)) return false;
  if (name.startsWith('media') && effect === 'media') return false;

  const imageUrl = resolveImageUrl(message, args);
  if (!imageUrl) {
    await replyError(message, `Attach an image, mention a user, or pass a URL for **${effect}**.`);
    return true;
  }

  try {
    const result = await generateMediaEffect(effect, imageUrl);
    if (result.buffer) {
      const file = new AttachmentBuilder(result.buffer, { name: result.filename });
      await message.reply({
        embeds: [deeloEmbed(effect, '').setImage(`attachment://${result.filename}`)],
        files: [file],
      });
      return true;
    }
    if (result.url) {
      await message.reply({ embeds: [deeloEmbed(effect, '').setImage(result.url)] });
      return true;
    }
    await replyError(message, `Could not generate **${effect}**.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image effect failed.';
    await replyError(message, msg.replace(/\*\*/g, ''));
  }
  return true;
}
