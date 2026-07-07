import type { PlanTier } from '@/lib/guild-settings';

const LIMITS: Record<PlanTier, Record<string, number>> = {
  free: {
    maxSavedEmbeds: 5,
  },
  premium: {
    maxSavedEmbeds: 50,
  },
  premium_plus: {
    maxSavedEmbeds: 100,
  },
};

export function getLimit(plan: PlanTier, key: string): number {
  return LIMITS[plan][key] ?? LIMITS.free[key] ?? 0;
}
