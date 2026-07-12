import type { DashboardGuildSettings } from '@/lib/guild-settings';
import { getExtraConfigPath } from '@/lib/guild-settings';
import type { GuildFullConfig } from '@/lib/guild-types';
import type { ModuleId } from '@/lib/dashboard-modules';

const NO_TOGGLE: ModuleId[] = ['overview', 'general', 'appearance', 'team', 'events', 'embeds', 'advanced'];

export function canToggleModule(id: ModuleId): boolean {
  return !NO_TOGGLE.includes(id);
}

function extraDisabled(guild: DashboardGuildSettings, id: ModuleId): boolean {
  const extra = (guild.extra_config ?? {}) as Record<string, unknown>;
  return getExtraConfigPath(extra, `modules.${id}.disabled`) === true;
}

/** Whether a module is considered enabled for the dashboard + bot. */
export function isModuleEnabled(
  id: ModuleId,
  guild: DashboardGuildSettings,
  config: GuildFullConfig,
): boolean {
  if (!canToggleModule(id)) return true;
  if (extraDisabled(guild, id)) return false;

  switch (id) {
    case 'welcome':
      return !!(
        guild.welcome_channel
        || guild.welcome_message
        || guild.goodbye_channel
        || guild.goodbye_message
        || config.guildMessages?.some((m) => m.enabled)
      );
    case 'moderation':
      return guild.automod_enabled || guild.antinuke_enabled || guild.antiraid_enabled || guild.snipe_enabled;
    case 'filters':
      return guild.automod_enabled || config.filters.length > 0;
    case 'responders':
      return config.responders.some((r) => r.enabled);
    case 'autoreact':
      return config.reactionTriggers.length > 0;
    case 'roles':
      return !!(
        guild.autorole
        || config.autoroles.length
        || config.vanityRoles.length
        || config.reactionRoles.length
        || config.buttonRoles.length
      );
    case 'levels':
      return guild.levels_enabled;
    case 'economy':
      return guild.economy_enabled;
    case 'starboard':
      return !!guild.starboard_channel || !!getExtraConfigPath((guild.extra_config ?? {}) as Record<string, unknown>, 'clownboard.channel');
    case 'voicemaster':
      return !!guild.voicemaster_join_channel;
    case 'tickets':
      return config.ticketPanels.length > 0;
    case 'social':
      return config.socialFeeds.length > 0 || config.counters.length > 0;
    default:
      return !extraDisabled(guild, id);
  }
}

export interface ModuleTogglePatch {
  guild: Partial<DashboardGuildSettings>;
  extra: Record<string, string | boolean>;
}

/** Build PATCH fragments for toggling a module on/off. */
export function buildModuleTogglePatch(
  id: ModuleId,
  enabled: boolean,
  guild: DashboardGuildSettings,
): ModuleTogglePatch {
  const guildPatch: Partial<DashboardGuildSettings> = {};
  const extra: Record<string, string | boolean> = {};

  extra[`modules.${id}.disabled`] = !enabled;

  switch (id) {
    case 'levels':
      guildPatch.levels_enabled = enabled;
      break;
    case 'economy':
      guildPatch.economy_enabled = enabled;
      break;
    case 'moderation':
      if (!enabled) {
        guildPatch.automod_enabled = false;
        guildPatch.antinuke_enabled = false;
        guildPatch.antiraid_enabled = false;
        guildPatch.snipe_enabled = false;
      } else {
        guildPatch.automod_enabled = true;
      }
      break;
    case 'filters':
      if (!enabled) guildPatch.automod_enabled = false;
      else guildPatch.automod_enabled = true;
      break;
    case 'welcome':
      if (!enabled) {
        guildPatch.welcome_channel = null;
        guildPatch.welcome_message = null;
        guildPatch.goodbye_channel = null;
        guildPatch.goodbye_message = null;
      }
      break;
    case 'starboard':
      if (!enabled) {
        guildPatch.starboard_channel = null;
      }
      break;
    case 'voicemaster':
      if (!enabled) {
        guildPatch.voicemaster_join_channel = null;
        guildPatch.voicemaster_category = null;
        guildPatch.voicemaster_interface_channel = null;
      }
      break;
    case 'roles':
      if (!enabled) guildPatch.autorole = null;
      break;
    case 'responders':
    case 'autoreact':
    case 'tickets':
    case 'social':
      break;
    default:
      break;
  }

  return { guild: guildPatch, extra };
}
