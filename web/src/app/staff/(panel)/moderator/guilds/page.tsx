import { createAdminClient } from '@/lib/supabase/admin';
import { GuildPlanEditor } from '@/components/admin-guild-editor';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';

export default async function ModeratorGuildsPage() {
  await requireStaffPage('guilds.write');

  const db = createAdminClient();
  const { data: guilds } = await db
    .from('guilds')
    .select('id, plan, prefix, plan_expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <StaffPageHeader
        badge="Bot moderator"
        title="Guild plans"
        description="Change server plan tier and duration. Each update syncs the guild subscription row automatically."
      />
      <GuildPlanEditor guilds={guilds ?? []} patchEndpoint="/api/staff/guilds" />
    </div>
  );
}
