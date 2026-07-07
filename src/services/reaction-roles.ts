import type { Guild, MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { getSupabase } from '../database/supabase';

function emojiKey(emoji: MessageReaction['emoji']): string {
  if (emoji.id) return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
  return emoji.name ?? '';
}

function matchesEmoji(stored: string, reaction: MessageReaction['emoji']): boolean {
  const key = emojiKey(reaction);
  if (stored === key || stored === reaction.name) return true;
  if (reaction.id && stored.includes(reaction.id)) return true;
  return false;
}

export async function handleReactionRole(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  add: boolean,
): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!message?.guild) return;

  const { data: rows } = await getSupabase()
    .from('reaction_roles')
    .select('*')
    .eq('guild_id', message.guild.id)
    .eq('message_id', message.id);

  const row = rows?.find((r) => matchesEmoji(r.emoji, reaction.emoji));
  if (!row) return;

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  const role = message.guild.roles.cache.get(row.role_id);
  if (!member || !role) return;

  if (add) {
    await member.roles.add(role).catch(() => {});
  } else {
    await member.roles.remove(role).catch(() => {});
  }
}
