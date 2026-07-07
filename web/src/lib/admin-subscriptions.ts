import type { createAdminClient } from '@/lib/supabase/admin';

type Db = ReturnType<typeof createAdminClient>;

export interface SubscriptionRow {
  id: number;
  guild_id: string;
  plan: string;
  status: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  cancelled_at: string | null;
}

/** Cancel all active subscriptions for a guild before issuing a new one. */
export async function cancelActiveSubscriptions(db: Db, guildId: string) {
  await db
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('guild_id', guildId)
    .eq('status', 'active');
}

/** Replace active subscription for a guild and sync guilds.plan. */
export async function setGuildSubscription(
  db: Db,
  opts: { guildId: string; plan: string; expiresAt: string | null; notes?: string },
) {
  const { guildId, plan, expiresAt, notes } = opts;

  await cancelActiveSubscriptions(db, guildId);

  if (plan === 'free') {
    await db.from('guilds').upsert({ id: guildId, plan: 'free', plan_expires_at: null }, { onConflict: 'id' });
    return null;
  }

  const { data: subscription, error } = await db
    .from('subscriptions')
    .insert({
      guild_id: guildId,
      plan,
      status: 'active',
      expires_at: expiresAt,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Sync guild row after subscription is created
  await db.from('guilds').upsert(
    { id: guildId, plan, plan_expires_at: expiresAt },
    { onConflict: 'id' },
  );

  return subscription as SubscriptionRow;
}

export interface SubscriptionView extends SubscriptionRow {
  historyCount: number;
  guildPlan?: string;
}

/** One row per guild — latest active, or most recent if none active. */
export function groupSubscriptionsByGuild(
  subs: SubscriptionRow[],
  guildPlans?: Map<string, string>,
): { current: SubscriptionView[]; duplicateCount: number } {
  const byGuild = new Map<string, SubscriptionRow[]>();
  for (const s of subs) {
    const list = byGuild.get(s.guild_id) ?? [];
    list.push(s);
    byGuild.set(s.guild_id, list);
  }

  const current: SubscriptionView[] = [];
  let duplicateCount = 0;

  for (const [guildId, list] of byGuild) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const active = sorted.find((s) => s.status === 'active');
    const primary = active ?? sorted[0];
    duplicateCount += sorted.length - 1;
    current.push({
      ...primary,
      historyCount: sorted.length - 1,
      guildPlan: guildPlans?.get(guildId),
    });
  }

  current.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { current, duplicateCount };
}

export function subscriptionStats(subs: SubscriptionRow[]) {
  const now = Date.now();
  const week = now + 7 * 86400000;
  let active = 0;
  let cancelled = 0;
  let expiringSoon = 0;
  const byPlan = { premium: 0, premium_plus: 0 };

  for (const s of subs) {
    if (s.status === 'active') {
      active++;
      if (s.plan === 'premium') byPlan.premium++;
      if (s.plan === 'premium_plus') byPlan.premium_plus++;
      if (s.expires_at) {
        const exp = new Date(s.expires_at).getTime();
        if (exp > now && exp < week) expiringSoon++;
      }
    } else if (s.status === 'cancelled') cancelled++;
  }

  return { active, cancelled, expiringSoon, byPlan, total: subs.length };
}
