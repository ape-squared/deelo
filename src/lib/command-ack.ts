import type { Message } from 'discord.js';
import type { Command } from '../types/command';

const ACK_EMOJI = '✅';

/** Commands that should never get a success reaction */
const NO_ACK = new Set([
  'help',
  'ping',
  'status',
  'snipe',
  'editsnipe',
  'play',
  'queue',
  'skip',
  'stop',
  'pause',
  'resume',
  'nowplaying',
  'blacktea',
  'tictactoe',
  'chatgpt',
  'warnings',
  'history',
  'case',
  'settings',
]);

/** Categories that get ✅ on successful commands by default */
const ACK_CATEGORIES = new Set(['config', 'roles', 'moderation', 'security']);

export function shouldAckCommand(command: Command, replyCount: number, succeeded: boolean): boolean {
  if (!succeeded) return false;
  if (command.ack === false || command.ack === 'never') return false;
  if (command.ack === true || command.ack === 'react') return true;
  if (NO_ACK.has(command.name)) return false;
  if (command.ack === 'only') return replyCount === 0;
  if (ACK_CATEGORIES.has(command.category)) return true;
  return false;
}

export async function ackCommandMessage(message: Message): Promise<void> {
  if (!message.guild?.members.me?.permissions.has('AddReactions')) return;
  const existing = message.reactions.cache.find((r) => r.emoji.name === ACK_EMOJI);
  if (existing?.me) return;
  await message.react(ACK_EMOJI).catch(() => {});
}
