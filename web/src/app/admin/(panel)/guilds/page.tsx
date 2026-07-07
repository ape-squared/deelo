import { createAdminClient } from '@/lib/supabase/admin';
import { GuildPlanEditor } from '@/components/admin-guild-editor';
import { AdminPageHeader } from '@/components/admin/ui';

export default async function AdminGuildsPage() {
  const db = createAdminClient();
  const { data: guilds } = await db
    .from('guilds')
    .select('id, plan, prefix, plan_expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <AdminPageHeader
        title="Plans & access"
        badge="Platform"
        description="Manage server plans, prefixes, and premium access across all registered guilds."
      />
      <GuildPlanEditor guilds={guilds ?? []} />
    </div>
  );
}
