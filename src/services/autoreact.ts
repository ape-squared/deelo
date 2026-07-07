import type { Message } from 'discord.js';

export function matchTrigger(content: string, trigger: string, matchType: string): boolean {
  const c = content.toLowerCase();
  const t = trigger.toLowerCase();
  if (matchType === 'exact') return c === t;
  if (matchType === 'startswith') return c.startsWith(t);
  return c.includes(t);
}

export async function handleAutoreact(message: Message): Promise<void> {
  if (!message.guild || !message.content || message.author.bot) return;

  const { isEventEnabled, getReactionTriggers, getGuildPlan } = await import('../database');
  const { hasFeature } = await import('../config/plans');

  if (!(await isEventEnabled(message.guild.id, 'reactiontrigger'))) return;

  const plan = await getGuildPlan(message.guild.id);
  if (!hasFeature(plan, 'reactionTriggers')) return;

  const triggers = await getReactionTriggers(message.guild.id);
  if (!triggers.length) return;

  for (const trigger of triggers) {
    if (matchTrigger(message.content, trigger.trigger, trigger.match_type ?? 'contains')) {
      await message.react(trigger.emoji).catch(() => {});
    }
  }
}
