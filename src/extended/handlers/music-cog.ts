import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replySuccess } from '../lib/helpers';

const NATIVE_MUSIC = new Set([
  'play', 'p', 'skip', 's', 'next', 'sk', 'stop', 'dc', 'disconnect',
  'nowplaying', 'np', 'pause', 'resume', 'volume', 'vol', 'shuffle',
  'repeat', 'loop', 'preset', 'presets', 'queue', 'q',
]);

export async function handleMusicCog(cmd: CommandDef, message: Message, _args: string[]): Promise<boolean> {
  if (cmd.cog !== 'music') return false;
  const name = cmd.name;

  if (NATIVE_MUSIC.has(name) || name.startsWith('preset ') || name.startsWith('queue ')) {
    return false;
  }

  if (name === 'fastforward' || name === 'rewind') {
    await replySuccess(
      message,
      `${name === 'fastforward' ? 'Fast-forward' : 'Rewind'} requires stream seeking and is not supported yet. Use \`,skip\` instead.`,
    );
    return true;
  }

  return false;
}
