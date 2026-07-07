import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo } from '../lib/helpers';
import { generateMediaEffect, MEDIA_EFFECT_NAMES } from '../../services/media-effects';
import { replyWithMediaEffect, resolveImageUrl } from '../../lib/reply-media';

function parseMediaOptions(effect: string, args: string[]) {
  const text = args.join(' ').trim();
  if (effect === 'meme') {
    const parts = text.split('|').map((s) => s.trim());
    return { topText: parts[0], bottomText: parts[1] ?? parts[0], text };
  }
  if (['flag', 'flag2'].includes(effect)) {
    return { flag: args[0], text: args[0] };
  }
  return { text: text || undefined, topText: args[0], bottomText: args.slice(1).join(' ') };
}

export async function handleManipulationCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'manipulation') return false;
  const name = cmd.name;

  if (name === 'media' && args.length === 0) {
    await replyInfo(
      message,
      'Media',
      `Image effects for avatars and attachments.\n\n**Usage:** \`,media <effect>\` with an image attached, a user mention, or image URL.\n\n**Examples:** \`,media blur\`, \`,media deepfry\`, \`,media meme | top | bottom\`\n\n**Effects:** ${MEDIA_EFFECT_NAMES.join(', ')}`,
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

  const mediaArgs = name.startsWith('media ') ? args : [];
  return replyWithMediaEffect(message, effect, imageUrl, parseMediaOptions(effect, mediaArgs));
}
