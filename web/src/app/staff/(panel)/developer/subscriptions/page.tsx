import { createAdminClient } from '@/lib/supabase/admin';
import { groupSubscriptionsByGuild } from '@/lib/admin-subscriptions';
import { SubscriptionManager } from '@/components/admin-subscriptions';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';

export default async function DeveloperSubscriptionsPage() {
  await requireStaffPage('subscriptions.write');

  const db = createAdminClient();
  const [{ data: subs }, { data: guilds }] = await Promise.all([
    db.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('guilds').select('id, plan'),
  ]);

  const guildPlans = Object.fromEntries((guilds ?? []).map((g) => [g.id, g.plan]));
  const { duplicateCount } = groupSubscriptionsByGuild(subs ?? [], new Map(Object.entries(guildPlans)));

  return (
    <div>
      <StaffPageHeader
        badge="Developer"
        title="Grant subscriptions"
        description="Create, extend, or cancel premium access. New grants replace any existing active subscription for the guild."
      />
      <SubscriptionManager
        initial={subs ?? []}
        guildPlans={guildPlans}
        duplicateCount={duplicateCount}
        apiEndpoint="/api/staff/subscriptions"
      />
    </div>
  );
}
