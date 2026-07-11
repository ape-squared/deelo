import type { PlanTier } from '@/lib/guild-settings';

const LIMITS: Record<PlanTier, Record<string, number>> = {
  free: {
    maxSavedEmbeds: 5,
    maxTicketPanels: 0,
  },
  premium: {
    maxSavedEmbeds: 50,
    maxTicketPanels: 10,
  },
  premium_plus: {
    maxSavedEmbeds: 100,
    maxTicketPanels: 25,
  },
};

const FEATURES: Record<PlanTier, Record<string, boolean>> = {
  free: {
    tickets: false,
  },
  premium: {
    tickets: true,
  },
  premium_plus: {
    tickets: true,
  },
};

export function getLimit(plan: PlanTier, key: string): number {
  return LIMITS[plan][key] ?? LIMITS.free[key] ?? 0;
}

export function hasPlanFeature(plan: PlanTier, feature: string): boolean {
  return FEATURES[plan][feature] ?? FEATURES.free[feature] ?? false;
}
