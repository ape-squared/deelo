import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';
import { AdminUsersTable } from '@/components/admin-users';

export default async function SupportUsersPage() {
  await requireStaffPage('users.read');

  const db = createAdminClient();
  const { data: users } = await db
    .from('dashboard_users')
    .select('*')
    .order('last_login', { ascending: false })
    .limit(200);

  return (
    <div>
      <StaffPageHeader
        badge="Support staff"
        title="User lookup"
        description="Discord accounts that have signed into the Deelo web dashboard — useful for login and access issues."
      />
      <AdminUsersTable users={(users ?? []).map((u) => ({ ...u, avatar: u.avatar ?? null }))} />
    </div>
  );
}
