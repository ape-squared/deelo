import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import { config } from '../config';
import { getBotAppearance } from '../services/guild-identity';
import type { GuildSettings } from '../database';

export type GuildEmbedContext =
  | Pick<GuildSettings, 'extra_config' | 'plan'>
  | { extra_config?: Record<string, unknown> | null; plan?: GuildSettings['plan'] }
  | null
  | undefined;

function isPremiumPlan(plan?: GuildSettings['plan']): boolean {
  return plan === 'premium' || plan === 'premium_plus';
}

function resolveEmbedColor(guild?: GuildEmbedContext): ColorResolvable {
  if (guild && isPremiumPlan(guild.plan)) {
    const appearance = getBotAppearance(guild.extra_config ?? null);
    if (appearance.embedColor !== null) return appearance.embedColor as ColorResolvable;
  }
  return config.botColor as ColorResolvable;
}

function resolveEmbedFooter(guild?: GuildEmbedContext): string {
  if (guild && isPremiumPlan(guild.plan)) {
    const appearance = getBotAppearance(guild.extra_config ?? null);
    if (appearance.embedFooter) return appearance.embedFooter;
  }
  return config.botName;
}

export function deeloEmbed(title?: string, description?: string, guild?: GuildEmbedContext): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(resolveEmbedColor(guild)).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  embed.setFooter({ text: resolveEmbedFooter(guild) });
  return embed;
}

export function successEmbed(description: string, guild?: GuildEmbedContext): EmbedBuilder {
  return deeloEmbed('✅ Success', description, guild);
}

export function errorEmbed(description: string, guild?: GuildEmbedContext): EmbedBuilder {
  return deeloEmbed('❌ Error', description, guild).setColor(0xed4245);
}

export function premiumEmbed(feature: string, guild?: GuildEmbedContext): EmbedBuilder {
  return errorEmbed(
    `**${feature}** is a premium feature. Upgrade your server with \`,premium\` to unlock it.\n\n` +
      `**Free** — Basic moderation, levels, snipe, giveaways, voicemaster\n` +
      `**Premium** — Antinuke, tickets, starboard, TTS, integrations & more\n` +
      `**Premium+** — Background removal, GIF maker, early access`,
    guild,
  );
}

export function embedsFor(guild?: GuildEmbedContext) {
  return {
    deelo: (title?: string, description?: string) => deeloEmbed(title, description, guild),
    success: (description: string) => successEmbed(description, guild),
    error: (description: string) => errorEmbed(description, guild),
    premium: (feature: string) => premiumEmbed(feature, guild),
  };
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

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

export { parseUserId, parseRoleId, parseChannelId, resolveUserId, resolveRoleId, resolveChannelId } from './parse';

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export function xpForLevel(level: number): number {
  return Math.pow(level / 0.1, 2);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
