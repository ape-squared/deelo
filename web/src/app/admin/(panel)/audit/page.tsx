import { createAdminClient } from '@/lib/supabase/admin';
import { AdminAuditLog } from '@/components/admin-audit';
import { AdminPageHeader } from '@/components/admin/ui';

export default async function AdminAuditPage() {
  const db = createAdminClient();
  const { data: logs } = await db
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader
        title="Audit Log"
        description="Complete history of administrative actions on the Deelo platform."
      />
      <AdminAuditLog logs={(logs ?? []).map((l) => ({ ...l, metadata: l.metadata as Record<string, unknown> | null }))} />
    </div>
  );
}
