import type { PlanTier } from '@/lib/guild-settings';

type Feature =
  | 'customPrefix'
  | 'antinuke'
  | 'antiraid'
  | 'starboard'
  | 'logging'
  | 'voicemasterGhost';

const FREE: Record<Feature, boolean> = {
  customPrefix: false,
  antinuke: false,
  antiraid: false,
  starboard: false,
  logging: false,
  voicemasterGhost: false,
};

const PREMIUM: Record<Feature, boolean> = {
  ...FREE,
  customPrefix: true,
  antinuke: true,
  antiraid: true,
  starboard: true,
  logging: true,
  voicemasterGhost: true,
};

function features(plan: PlanTier): Record<Feature, boolean> {
  return plan === 'free' ? FREE : PREMIUM;
}

export function planHasFeature(plan: PlanTier, feature: Feature): boolean {
  return features(plan)[feature];
}

export function validatePremiumPatch(
  plan: PlanTier,
  updates: Record<string, unknown>,
): string | null {
  if ('prefix' in updates && updates.prefix !== ',' && !planHasFeature(plan, 'customPrefix')) {
    return 'Custom prefix requires Premium. Upgrade at /pricing';
  }
  if (updates.antinuke_enabled === true && !planHasFeature(plan, 'antinuke')) {
    return 'Anti-nuke requires Premium.';
  }
  if (updates.antiraid_enabled === true && !planHasFeature(plan, 'antiraid')) {
    return 'Anti-raid requires Premium.';
  }
  if (updates.starboard_channel && !planHasFeature(plan, 'starboard')) {
    return 'Starboard requires Premium.';
  }
  if (updates.mod_log_channel && !planHasFeature(plan, 'logging')) {
    return 'Mod log channel requires Premium.';
  }
  return null;
}
