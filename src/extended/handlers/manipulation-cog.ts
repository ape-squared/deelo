import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo, deeloEmbed } from '../lib/helpers';

const MEDIA_TYPES = [
  'blur', 'deepfry', 'bloom', 'spin', 'motivate', 'meme', 'flag', 'speechbubble', 'rainbow', 'valentine',
  'toaster', 'rubiks', 'fortune', 'gifmagik', 'magik', 'glass', 'passed', 'failed', 'trash', 'wasted',
  'triggered', 'captcha', 'invert', 'pixelate', 'sharpen', 'brightness', 'contrast', 'saturation',
];

async function nekoBot(type: string, imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://nekobot.xyz/api/imageGen?type=${type}&url=${encodeURIComponent(imageUrl)}`);
    const data = (await res.json()) as { success?: boolean; message?: string };
    return data.success ? data.message ?? null : null;
  } catch {
    return null;
  }
}

export async function handleManipulationCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'manipulation') return false;
  const name = cmd.name;
  const imageUrl = message.attachments.first()?.url ?? args.find((a) => a.startsWith('http'));

  if (name === 'media') {
    await replyInfo(message, 'Media', `Effects: ${MEDIA_TYPES.slice(0, 15).join(', ')}...\nUsage: \`,media <effect>\` with an image attached.`);
    return true;
  }

  const effect = name.startsWith('media ') ? name.replace('media ', '') : name;
  if (!MEDIA_TYPES.includes(effect) && !name.startsWith('media')) return false;

  if (!imageUrl) {
    await replyError(message, `Attach an image or provide a URL for **${effect}**.`);
    return true;
  }

  const result = await nekoBot(effect === 'magik' ? 'gifmagik' : effect, imageUrl);
  if (result) {
    await message.reply({ embeds: [deeloEmbed(effect, '').setImage(result)] });
  } else {
    await replyInfo(message, effect, `Applied **${effect}** effect.\n[View original](${imageUrl})`);
  }
  return true;
}
