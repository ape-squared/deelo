import { createAdminClient } from '@/lib/supabase/admin';
import { AdminUsersTable } from '@/components/admin-users';
import { AdminPageHeader } from '@/components/admin/ui';

export default async function AdminUsersPage() {
  const db = createAdminClient();
  const { data: users } = await db
    .from('dashboard_users')
    .select('*')
    .order('last_login', { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader
        title="Dashboard Users"
        description="Discord users who have signed into the Deelo web dashboard."
      />
      <AdminUsersTable users={(users ?? []).map((u) => ({ ...u, avatar: u.avatar ?? null }))} />
    </div>
  );
}
