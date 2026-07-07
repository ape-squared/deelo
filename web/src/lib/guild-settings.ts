/** Synced from deelo/shared/guild-settings.ts — keep both files in sync. */

export type PlanTier = 'free' | 'premium' | 'premium_plus';

export interface DashboardGuildSettings {
  id: string;
  prefix: string;
  plan: PlanTier;
  plan_expires_at: string | null;
  welcome_channel: string | null;
  welcome_message: string | null;
  goodbye_channel: string | null;
  goodbye_message: string | null;
  mod_log_channel: string | null;
  mute_role: string | null;
  jail_role: string | null;
  autorole: string | null;
  levels_enabled: boolean;
  levels_channel: string | null;
  levels_multiplier: number;
  snipe_enabled: boolean;
  automod_enabled: boolean;
  antinuke_enabled: boolean;
  antinuke_threshold: number;
  antiraid_enabled: boolean;
  antiraid_min_age: number;
  antiraid_avatar: boolean;
  fake_permissions_enabled: boolean;
  starboard_channel: string | null;
  starboard_threshold: number;
  voicemaster_category: string | null;
  voicemaster_join_channel: string | null;
  voicemaster_interface_channel: string | null;
  voicemaster_default_name: string;
  voicemaster_default_bitrate: number;
  voicemaster_join_role: string | null;
  bump_channel: string | null;
  bump_interval: number;
  extra_config?: Record<string, unknown>;
}

export const DASHBOARD_PATCH_FIELDS = [
  'prefix',
  'welcome_channel',
  'welcome_message',
  'goodbye_channel',
  'goodbye_message',
  'mod_log_channel',
  'mute_role',
  'jail_role',
  'autorole',
  'levels_enabled',
  'levels_channel',
  'levels_multiplier',
  'automod_enabled',
  'antinuke_enabled',
  'antinuke_threshold',
  'antiraid_enabled',
  'antiraid_min_age',
  'antiraid_avatar',
  'fake_permissions_enabled',
  'snipe_enabled',
  'starboard_channel',
  'starboard_threshold',
  'voicemaster_category',
  'voicemaster_join_channel',
  'voicemaster_interface_channel',
  'voicemaster_default_name',
  'voicemaster_default_bitrate',
  'voicemaster_join_role',
  'bump_channel',
  'bump_interval',
] as const;

export type DashboardPatchField = (typeof DASHBOARD_PATCH_FIELDS)[number];

export const EVENT_TOGGLE_SYNC: Record<string, string> = {
  snipe_enabled: 'snipe',
  levels_enabled: 'levels',
};

export const WELCOME_VARIABLES = '{user}, {user.name}, {server}, {membercount}';

export function sanitizeChannelId(value: unknown): string | null {
  if (value === null || value === '') return null;
  const s = String(value).trim();
  return /^\d{17,20}$/.test(s) ? s : null;
}

export function sanitizeRoleId(value: unknown): string | null {
  return sanitizeChannelId(value);
}

export function sanitizePrefix(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const p = value.trim();
  if (!p || p.length > 5) return null;
  return p;
}

export function sanitizeMultiplier(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(n) || n < 0.1 || n > 10) return null;
  return Math.round(n * 10) / 10;
}

export function sanitizeThreshold(value: unknown, min = 1, max = 50): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
}

export function sanitizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export function pickPatchFields(body: Record<string, unknown>): Partial<Record<DashboardPatchField, unknown>> {
  const updates: Partial<Record<DashboardPatchField, unknown>> = {};
  for (const key of DASHBOARD_PATCH_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  return updates;
}

/** Merge dot-path keys into nested extra_config object */
export function setExtraConfigPath(config: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const out = { ...config };
  const parts = path.split('.');
  let cur: Record<string, unknown> = out;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur[p] = typeof cur[p] === 'object' && cur[p] !== null ? { ...(cur[p] as Record<string, unknown>) } : {};
    cur = cur[p] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (value === null || value === '') delete cur[last];
  else cur[last] = value;
  return out;
}

export function getExtraConfigPath(config: Record<string, unknown> | undefined, path: string): unknown {
  if (!config) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, config);
}
