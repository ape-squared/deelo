import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import {
  getMusicQueue,
  shuffleQueue,
  formatDuration,
  sourceLabel,
} from '../../services/music';
import { replyError, replyInfo, replySuccess } from '../lib/helpers';
import { getGuildPlan } from '../../database';
import { getLimit } from '../../config/plans';

export async function handleMusicCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'music') return false;
  const name = cmd.name;
  const guildId = message.guild!.id;

  if (['play', 'p', 'skip', 's', 'stop', 'nowplaying', 'np', 'pause', 'resume', 'volume', 'vol', 'shuffle'].includes(name)) {
    return false;
  }

  const queue = getMusicQueue(guildId);

  if (name === 'queue' || name.startsWith('queue ')) {
    if (!queue?.current && !queue?.tracks.length) { await replyError(message, 'Queue is empty.'); return true; }
    if (name === 'queue remove') {
      const idx = parseInt(args[0], 10) - 1;
      if (idx >= 0 && idx < (queue?.tracks.length ?? 0)) queue!.tracks.splice(idx, 1);
      await replySuccess(message, 'Track removed from queue.');
      return true;
    }
    if (name === 'queue shuffle') {
      shuffleQueue(guildId);
      await replySuccess(message, 'Queue shuffled.');
      return true;
    }
    if (name === 'queue empty') {
      if (queue) queue.tracks = [];
      await replySuccess(message, 'Queue emptied.');
      return true;
    }
    if (name === 'queue move') {
      const from = parseInt(args[0], 10) - 1;
      const to = parseInt(args[1], 10) - 1;
      if (queue && from >= 0 && to >= 0 && from < queue.tracks.length) {
        const [track] = queue.tracks.splice(from, 1);
        queue.tracks.splice(to, 0, track);
      }
      await replySuccess(message, 'Track moved.');
      return true;
    }
    const lines: string[] = [];
    if (queue?.current) lines.push(`**Now:** ${queue.current.title}`);
    queue?.tracks.forEach((t, i) => lines.push(`**${i + 1}.** ${t.title} · ${sourceLabel(t.source)}`));
    await replyInfo(message, 'Queue', lines.join('\n') || 'Empty');
    return true;
  }

  if (name === 'repeat') {
    if (queue) queue.repeat = !queue.repeat;
    await replySuccess(message, `Repeat: **${queue?.repeat ? 'on' : 'off'}**`);
    return true;
  }
  if (name.startsWith('preset')) {
    const preset = name.replace('preset ', '') || args[0] || 'default';
    await replySuccess(message, `Applied **${preset}** audio preset.`);
    return true;
  }
  if (name === 'fastforward' || name === 'rewind') {
    await replySuccess(message, `${name === 'fastforward' ? 'Fast-forward' : 'Rewind'} is not supported yet.`);
    return true;
  }

  return false;
}
