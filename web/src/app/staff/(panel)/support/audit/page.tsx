import { createAdminClient } from '@/lib/supabase/admin';
import { AdminAuditLog } from '@/components/admin-audit';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';

export default async function SupportAuditPage() {
  await requireStaffPage('audit.read');

  const db = createAdminClient();
  const { data: logs } = await db
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <StaffPageHeader
        badge="Support staff"
        title="Audit log"
        description="Recent platform actions — guild plan changes, subscription grants, and staff operations."
      />
      <AdminAuditLog logs={(logs ?? []).map((l) => ({ ...l, metadata: l.metadata as Record<string, unknown> | null }))} />
    </div>
  );
}
