import { createAdminClient } from '@/lib/supabase/admin';
import { groupSubscriptionsByGuild } from '@/lib/admin-subscriptions';
import { SubscriptionManager } from '@/components/admin-subscriptions';
import { AdminPageHeader } from '@/components/admin/ui';

export default async function AdminSubscriptionsPage() {
  const db = createAdminClient();
  const [{ data: subs }, { data: guilds }] = await Promise.all([
    db.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('guilds').select('id, plan'),
  ]);

  const guildPlans = Object.fromEntries((guilds ?? []).map((g) => [g.id, g.plan]));
  const { duplicateCount } = groupSubscriptionsByGuild(subs ?? [], new Map(Object.entries(guildPlans)));

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        description="Manage premium access per guild. Each guild can only have one active subscription — new grants replace the previous one."
      />
      <SubscriptionManager
        initial={subs ?? []}
        guildPlans={guildPlans}
        duplicateCount={duplicateCount}
      />
    </div>
  );
}
