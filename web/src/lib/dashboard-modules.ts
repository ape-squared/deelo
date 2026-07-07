import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid, Sparkles, MessageSquare, Shield, Filter, Bot, Users,
  TrendingUp, Star, Mic, Ticket, Zap, Radio, Settings2, Smile,
} from 'lucide-react';
import type { DashboardGuildSettings } from '@/lib/guild-settings';
import type { GuildFullConfig } from '@/lib/guild-types';

export type ModuleId =
  | 'overview'
  | 'general'
  | 'welcome'
  | 'moderation'
  | 'filters'
  | 'responders'
  | 'autoreact'
  | 'roles'
  | 'levels'
  | 'starboard'
  | 'voicemaster'
  | 'tickets'
  | 'events'
  | 'social'
  | 'advanced';

export interface DashboardModule {
  id: ModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
  premium?: boolean;
}

export interface ModuleGroup {
  label: string;
  modules: DashboardModule[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Server',
    modules: [
      { id: 'overview', label: 'Overview', description: 'Module status and quick access', icon: LayoutGrid },
      { id: 'general', label: 'General', description: 'Prefix, plan, and core settings', icon: Sparkles },
    ],
  },
  {
    label: 'Moderation',
    modules: [
      { id: 'welcome', label: 'Welcome', description: 'Greet new members and goodbye messages', icon: MessageSquare },
      { id: 'moderation', label: 'Moderation', description: 'Automod, anti-nuke, anti-raid, mod logs', icon: Shield },
      { id: 'filters', label: 'Filters', description: 'Word, link, and invite filters', icon: Filter },
      { id: 'responders', label: 'Responders', description: 'Automatic replies to triggers', icon: Bot },
      { id: 'autoreact', label: 'Auto React', description: 'React to messages matching triggers', icon: Smile, premium: true },
    ],
  },
  {
    label: 'Community',
    modules: [
      { id: 'roles', label: 'Autoroles', description: 'Join roles, vanity, reaction roles', icon: Users },
      { id: 'levels', label: 'Leveling', description: 'XP, level-up channel, and rewards', icon: TrendingUp },
      { id: 'starboard', label: 'Starboard', description: 'Highlight popular messages', icon: Star, premium: true },
    ],
  },
  {
    label: 'Utility',
    modules: [
      { id: 'voicemaster', label: 'VoiceMaster', description: 'Join-to-create voice channels', icon: Mic },
      { id: 'tickets', label: 'Tickets', description: 'Support ticket panels', icon: Ticket },
      { id: 'social', label: 'Social', description: 'Feeds and stat counters', icon: Radio },
      { id: 'events', label: 'Events', description: 'Toggle bot event handlers', icon: Zap },
      { id: 'advanced', label: 'Advanced', description: 'Aliases, logs, and extras', icon: Settings2 },
    ],
  },
];

export const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);

export function moduleById(id: string): DashboardModule | undefined {
  return ALL_MODULES.find((m) => m.id === id);
}

export function isValidModuleId(id: string): id is ModuleId {
  return ALL_MODULES.some((m) => m.id === id);
}

export function getModuleStatus(
  id: ModuleId,
  guild: DashboardGuildSettings,
  config: GuildFullConfig,
): { enabled: boolean; detail: string } {
  switch (id) {
    case 'overview':
      return { enabled: true, detail: 'Dashboard home' };
    case 'general':
      return { enabled: true, detail: `Prefix: ${guild.prefix}` };
    case 'welcome':
      return {
        enabled: !!(guild.welcome_channel || guild.welcome_message || guild.goodbye_channel),
        detail: guild.welcome_channel ? 'Channel configured' : 'Not configured',
      };
    case 'moderation':
      return {
        enabled: guild.automod_enabled || guild.antinuke_enabled || guild.antiraid_enabled,
        detail: [
          guild.automod_enabled && 'Automod',
          guild.antinuke_enabled && 'Anti-nuke',
          guild.antiraid_enabled && 'Anti-raid',
        ].filter(Boolean).join(', ') || 'Off',
      };
    case 'filters':
      return {
        enabled: config.filters.length > 0 || guild.automod_enabled,
        detail: `${config.filters.length} filter${config.filters.length === 1 ? '' : 's'}`,
      };
    case 'responders':
      return {
        enabled: config.responders.some((r) => r.enabled),
        detail: `${config.responders.length} responder${config.responders.length === 1 ? '' : 's'}`,
      };
    case 'autoreact':
      return {
        enabled: config.reactionTriggers.length > 0,
        detail: `${config.reactionTriggers.length} trigger${config.reactionTriggers.length === 1 ? '' : 's'}`,
      };
    case 'roles':
      return {
        enabled: !!(guild.autorole || config.autoroles.length || config.vanityRoles.length),
        detail: `${config.autoroles.length + (guild.autorole ? 1 : 0)} role setup`,
      };
    case 'levels':
      return {
        enabled: guild.levels_enabled,
        detail: guild.levels_enabled ? `${config.levelRewards.length} rewards` : 'Disabled',
      };
    case 'starboard':
      return {
        enabled: !!guild.starboard_channel,
        detail: guild.starboard_channel ? `${guild.starboard_threshold} stars` : 'Not configured',
      };
    case 'voicemaster':
      return {
        enabled: !!guild.voicemaster_join_channel,
        detail: guild.voicemaster_join_channel ? 'Join channel set' : 'Not configured',
      };
    case 'tickets':
      return {
        enabled: config.ticketPanels.length > 0,
        detail: `${config.ticketPanels.length} panel${config.ticketPanels.length === 1 ? '' : 's'}`,
      };
    case 'social':
      return {
        enabled: config.socialFeeds.length > 0 || config.counters.length > 0,
        detail: `${config.socialFeeds.length} feeds · ${config.counters.length} counters`,
      };
    case 'events':
      return {
        enabled: config.eventToggles.some((t) => !t.enabled),
        detail: `${config.eventToggles.filter((t) => t.enabled).length} active`,
      };
    case 'advanced':
      return {
        enabled: config.commandAliases.length > 0,
        detail: `${config.commandAliases.length} aliases`,
      };
    default:
      return { enabled: false, detail: '' };
  }
}
