import type { Message } from 'discord.js';

export function parseUserId(input?: string | null): string | null {
  if (!input) return null;
  const match = input.match(/^<@!?(\d+)>$/) || input.match(/^(\d{17,20})$/);
  return match ? match[1] : null;
}

export function parseRoleId(input?: string | null): string | null {
  if (!input) return null;
  const match = input.match(/^<@&(\d+)>$/) || input.match(/^(\d{17,20})$/);
  return match ? match[1] : null;
}

export function parseChannelId(input?: string | null): string | null {
  if (!input) return null;
  const match = input.match(/^<#(\d+)>$/) || input.match(/^(\d{17,20})$/);
  return match ? match[1] : null;
}

/** Resolve a user from a mention or argument string. */
export function resolveUserId(message: Message, arg?: string): string | null {
  return message.mentions.users.first()?.id ?? parseUserId(arg);
}

/** Resolve a role from a mention or argument string. */
export function resolveRoleId(message: Message, arg?: string): string | null {
  return message.mentions.roles.first()?.id ?? parseRoleId(arg);
}

/** Resolve a channel from a mention or argument string. */
export function resolveChannelId(message: Message, arg?: string): string | null {
  return message.mentions.channels.first()?.id ?? parseChannelId(arg);
}

export function parseDuration(input?: string | null): number | null {
  if (!input) return null;
  const match = input.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return value * multipliers[unit];
}
