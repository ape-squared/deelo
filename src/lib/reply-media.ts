import { AttachmentBuilder, type Message } from 'discord.js';
import { generateMediaEffect, type MediaEffectOptions } from '../services/media-effects';
import { deeloEmbed, errorEmbed } from '../utils/embeds';

export function resolveImageUrl(message: Message, args: string[]): string | undefined {
  return (
    message.attachments.first()?.url ??
    message.mentions.users.first()?.displayAvatarURL({ extension: 'png', size: 512 }) ??
    args.find((a) => /^https?:\/\//i.test(a))
  );
}

export async function replyWithMediaEffect(
  message: Message,
  effect: string,
  imageUrl: string,
  options?: MediaEffectOptions,
): Promise<boolean> {
  try {
    const result = await generateMediaEffect(effect, imageUrl, options);
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
    await message.reply({ embeds: [errorEmbed(`Could not generate **${effect}**.`)] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image effect failed.';
    await message.reply({ embeds: [errorEmbed(msg.replace(/\*\*/g, ''))] });
  }
  return true;
}
