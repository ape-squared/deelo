import { getAdminSession } from '@/lib/admin-session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;

  const { data: admin, error } = await createAdminClient()
    .from('admin_users')
    .select('*')
    .eq('id', session.userId)
    .maybeSingle();

  if (error || !admin) return null;
  return { ...admin, authUser: { id: session.userId, email: session.email } };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  await createAdminClient().from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? {},
  });
}
