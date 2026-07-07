import type { PlanTier } from '@/lib/guild-settings';

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};

export interface PlanSource {
  plan: string;
  plan_expires_at?: string | null;
}

export interface SubscriptionSource {
  plan: string;
  status: string;
  expires_at?: string | null;
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function asTier(plan: string): PlanTier {
  if (plan === 'premium' || plan === 'premium_plus') return plan;
  return 'free';
}

function higherPlan(a: PlanTier, b: PlanTier): PlanTier {
  return PLAN_RANK[a] >= PLAN_RANK[b] ? a : b;
}

/** Resolve the plan the dashboard/bot should use — subscription wins when active. */
export function resolveEffectivePlan(
  guild: PlanSource,
  subscription?: SubscriptionSource | null,
): { plan: PlanTier; plan_expires_at: string | null; source: 'subscription' | 'guild' | 'free' } {
  const guildTier = asTier(guild.plan);
  const guildExpired = isExpired(guild.plan_expires_at);

  let best: PlanTier = guildExpired ? 'free' : guildTier;
  let expires: string | null = guildExpired ? null : (guild.plan_expires_at ?? null);
  let source: 'subscription' | 'guild' | 'free' = best === 'free' ? 'free' : 'guild';

  if (subscription?.status === 'active' && !isExpired(subscription.expires_at)) {
    const subTier = asTier(subscription.plan);
    if (PLAN_RANK[subTier] >= PLAN_RANK[best]) {
      best = subTier;
      expires = subscription.expires_at ?? null;
      source = 'subscription';
    }
  }

  return { plan: best, plan_expires_at: expires, source };
}

/** True when guild.plan should be updated to match subscription. */
export function needsPlanSync(
  guild: PlanSource,
  subscription?: SubscriptionSource | null,
): { plan: PlanTier; plan_expires_at: string | null } | null {
  const effective = resolveEffectivePlan(guild, subscription);
  const guildTier = asTier(guild.plan);
  const guildExpired = isExpired(guild.plan_expires_at);

  if (effective.source === 'subscription' && (guildTier !== effective.plan || guildExpired)) {
    return { plan: effective.plan, plan_expires_at: effective.plan_expires_at };
  }

  if (guildExpired && guildTier !== 'free' && effective.plan === 'free') {
    return { plan: 'free', plan_expires_at: null };
  }

  return null;
}
