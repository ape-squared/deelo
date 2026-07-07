import type { PlanTier } from '@/lib/guild-settings';
import {
  EVENT_TOGGLE_SYNC,
  pickPatchFields,
  sanitizeBoolean,
  sanitizeChannelId,
  sanitizeMultiplier,
  sanitizePrefix,
  sanitizeRoleId,
  sanitizeThreshold,
  setExtraConfigPath,
  type DashboardPatchField,
} from '@/lib/guild-settings';
import { validatePremiumPatch } from '@/lib/plan-gates';

export function normalizeGuildPatch(
  body: Record<string, unknown>,
  plan: PlanTier,
  existingExtra?: Record<string, unknown>,
): {
  updates: Record<string, unknown>;
  error: string | null;
  eventToggles: Array<{ event: string; enabled: boolean }>;
} {
  const raw = pickPatchFields(body);
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw) as [DashboardPatchField, unknown][]) {
    switch (key) {
      case 'prefix': {
        const p = sanitizePrefix(value);
        if (!p) return { updates: {}, error: 'Invalid prefix (1–5 characters).', eventToggles: [] };
        updates.prefix = p;
        break;
      }
      case 'welcome_channel':
      case 'goodbye_channel':
      case 'mod_log_channel':
      case 'levels_channel':
      case 'starboard_channel':
      case 'voicemaster_category':
      case 'voicemaster_join_channel':
      case 'voicemaster_interface_channel':
      case 'bump_channel':
        updates[key] = sanitizeChannelId(value);
        break;
      case 'mute_role':
      case 'jail_role':
      case 'autorole':
      case 'voicemaster_join_role':
        updates[key] = sanitizeRoleId(value);
        break;
      case 'welcome_message':
      case 'goodbye_message':
      case 'voicemaster_default_name':
        updates[key] = value === null || value === '' ? null : String(value).slice(0, 2000);
        break;
      case 'levels_multiplier':
        updates[key] = sanitizeMultiplier(value) ?? 1;
        break;
      case 'antinuke_threshold':
        updates[key] = sanitizeThreshold(value, 1, 20) ?? 5;
        break;
      case 'starboard_threshold':
        updates[key] = sanitizeThreshold(value, 1, 25) ?? 3;
        break;
      case 'antiraid_min_age':
        updates[key] = sanitizeThreshold(value, 0, 365) ?? 7;
        break;
      case 'voicemaster_default_bitrate':
        updates[key] = sanitizeThreshold(value, 8, 384) ?? 64;
        break;
      case 'bump_interval': {
        const ms = typeof value === 'number' ? value : parseInt(String(value), 10);
        updates[key] = isNaN(ms) ? 7200000 : Math.min(Math.max(ms, 60000), 86400000);
        break;
      }
      case 'levels_enabled':
      case 'snipe_enabled':
      case 'automod_enabled':
      case 'antinuke_enabled':
      case 'antiraid_enabled':
      case 'antiraid_avatar':
      case 'fake_permissions_enabled':
        updates[key] = sanitizeBoolean(value);
        break;
      default:
        break;
    }
  }

  // extra_config dot-path updates: { extra_config: { "starboard.emoji": "⭐" } }
  const extraPatch = body.extra_config;
  if (extraPatch && typeof extraPatch === 'object' && !Array.isArray(extraPatch)) {
    let merged = { ...(existingExtra ?? {}) };
    for (const [path, val] of Object.entries(extraPatch as Record<string, unknown>)) {
      merged = setExtraConfigPath(merged, path, val === '' ? null : val);
    }
    updates.extra_config = merged;
  }

  if (!Object.keys(updates).length) {
    return { updates: {}, error: 'No valid fields to update.', eventToggles: [] };
  }

  const premiumError = validatePremiumPatch(plan, updates);
  if (premiumError) return { updates: {}, error: premiumError, eventToggles: [] };

  const eventToggles: Array<{ event: string; enabled: boolean }> = [];
  for (const [field, event] of Object.entries(EVENT_TOGGLE_SYNC)) {
    if (field in updates && typeof updates[field] === 'boolean') {
      eventToggles.push({ event, enabled: updates[field] as boolean });
    }
  }

  return { updates, error: null, eventToggles };
}
