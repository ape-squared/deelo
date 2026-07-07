import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import { config } from '../config';

export function deeloEmbed(title?: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(config.botColor as ColorResolvable).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  embed.setFooter({ text: config.botName });
  return embed;
}

export function successEmbed(description: string): EmbedBuilder {
  return deeloEmbed('✅ Success', description);
}

export function errorEmbed(description: string): EmbedBuilder {
  return deeloEmbed('❌ Error', description).setColor(0xed4245);
}

export function premiumEmbed(feature: string): EmbedBuilder {
  return errorEmbed(
    `**${feature}** is a premium feature. Upgrade your server with \`,premium\` to unlock it.\n\n` +
      `**Free** — Basic moderation, levels, snipe, giveaways, voicemaster\n` +
      `**Premium** — Antinuke, tickets, starboard, TTS, integrations & more\n` +
      `**Premium+** — Background removal, GIF maker, early access`
  );
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
