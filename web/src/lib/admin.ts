import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminHasPermission, adminMeetsRole, type AdminPermission, type AdminUserRole } from '@/lib/platform-roles';

export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;

  const { data: admin, error } = await createAdminClient()
    .from('admin_users')
    .select('*')
    .eq('id', session.userId)
    .maybeSingle();

  if (error || !admin) return null;
  return { ...admin, role: admin.role as AdminUserRole, authUser: { id: session.userId, email: session.email } };
}

export async function requireAdmin(permission?: AdminPermission, minimumRole?: AdminUserRole) {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (minimumRole && !adminMeetsRole(admin.role, minimumRole)) {
    return { error: NextResponse.json({ error: 'Insufficient admin role' }, { status: 403 }) };
  }
  if (permission && !adminHasPermission(admin.role, permission)) {
    return { error: NextResponse.json({ error: 'Insufficient admin permissions' }, { status: 403 }) };
  }
  return { admin };
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
