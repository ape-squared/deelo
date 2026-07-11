import type { ChatInputCommandInteraction, Message, PermissionResolvable } from 'discord.js';
import type { DeeloClient } from '../client';
import type { GuildSettings } from '../database';

export interface CommandContext {
  client: DeeloClient;
  message: Message;
  args: string[];
  commandName: string;
  guildSettings?: GuildSettings;
}

export interface SlashContext {
  client: DeeloClient;
  interaction: ChatInputCommandInteraction;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  category: string;
  usage?: string;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  premiumFeature?: keyof import('../config/plans').PlanFeatures;
  ownerOnly?: boolean;
  guildOnly?: boolean;
  cooldown?: number;
  /** Success feedback: true/react = ✅ reaction; only = react when command sends no reply; never = no reaction */
  ack?: boolean | 'react' | 'only' | 'never';
  run: (ctx: CommandContext) => Promise<void>;
  slash?: {
    description: string;
    options?: object[];
    run: (ctx: SlashContext) => Promise<void>;
  };
}

export interface CommandCategory {
  name: string;
  emoji: string;
  description: string;
}

export const CATEGORIES: CommandCategory[] = [
  { name: 'moderation', emoji: '🛡️', description: 'Ban, kick, mute, warn, purge & more' },
  { name: 'security', emoji: '🔒', description: 'Antinuke, antiraid, automod, filters' },
  { name: 'utility', emoji: '🔧', description: 'Snipe, AFK, translate, avatar, help' },
  { name: 'fun', emoji: '🎮', description: 'Games, trivia, memes' },
  { name: 'levels', emoji: '📊', description: 'XP, leaderboards, rewards' },
  { name: 'economy', emoji: '💰', description: 'Balance, daily, work, shop, and transfers' },
  { name: 'config', emoji: '⚙️', description: 'Welcome, logging, prefix, events' },
  { name: 'roles', emoji: '🎭', description: 'Reaction roles, button roles, vanity' },
  { name: 'giveaways', emoji: '🎁', description: 'Create and manage giveaways' },
  { name: 'tickets', emoji: '🎫', description: 'Support ticket system' },
  { name: 'voicemaster', emoji: '🔊', description: 'Temporary voice channels' },
  { name: 'music', emoji: '🎵', description: 'Play music in voice channels' },
  { name: 'integrations', emoji: '🔗', description: 'Last.fm, social feeds' },
  { name: 'premium', emoji: '⭐', description: 'Plans, upgrades, perks' },
];
