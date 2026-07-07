import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo, deeloEmbed } from '../lib/helpers';

const ROLEPLAY_ACTIONS = new Set([
  'roleplay', 'airkiss', 'angrystare', 'bite', 'bleh', 'brofist', 'celebrate', 'cheers', 'clap', 'confused', 'cool', 'cry',
  'cuddle', 'dance', 'drool', 'evillaugh', 'facepalm', 'handhold', 'happy', 'headbang', 'hug', 'kiss', 'laugh', 'lick',
  'love', 'mad', 'no', 'nom', 'nosebleed', 'nuzzle', 'pat', 'peek', 'pinch', 'poke', 'pout', 'punch', 'run', 'sad',
  'scared', 'shout', 'shrug', 'shy', 'sigh', 'sip', 'slap', 'sleep', 'slowclap', 'smack', 'smile', 'smug', 'sneeze',
  'sorry', 'stare', 'stop', 'surprised', 'sweat', 'thumbsup', 'tickle', 'tired', 'wave', 'wink', 'woah', 'yawn', 'yes',
  'highfive', 'kill', 'baka', 'bonk', 'cringe', 'yeet', 'glomp', 'bully', 'feed', 'bored', 'think', 'stfu', 'sleep',
  'nervous', 'nyah', 'yay',
]);

async function fetchGif(action: string): Promise<string | null> {
  const mapped = action === 'roleplay' ? 'hug' : action.replace('roleplay ', '');
  try {
    const res = await fetch(`https://nekos.best/api/v2/${mapped}?amount=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ url: string }> };
    return data.results?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

export async function handleRoleplayCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'roleplay') return false;
  const action = cmd.name === 'roleplay' ? (args[0]?.toLowerCase() ?? 'hug') : cmd.name;
  if (!ROLEPLAY_ACTIONS.has(cmd.name) && cmd.name !== 'roleplay') return false;

  const target = message.mentions.users.first();
  const gif = await fetchGif(action);
  const text = target
    ? `**${message.author.username}** ${action}s **${target.username}**!`
    : `**${message.author.username}** ${action}s!`;
  const embed = deeloEmbed(action.charAt(0).toUpperCase() + action.slice(1), text);
  if (gif) embed.setImage(gif);
  await message.reply({ embeds: [embed] });
  return true;
}
