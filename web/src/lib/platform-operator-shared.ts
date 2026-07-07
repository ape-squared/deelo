import {
  adminHasPermission,
  platformHasPermission,
  type AdminPermission,
  type AdminUserRole,
  type PlatformPermission,
  type PlatformStaffRole,
} from '@/lib/platform-roles';

export type PlatformOperator =
  | { kind: 'email'; id: string; label: string; role: AdminUserRole }
  | { kind: 'discord'; id: string; label: string; role: PlatformStaffRole };

export function operatorCanManageStaff(op: PlatformOperator): boolean {
  if (op.kind === 'email') return op.role === 'superadmin';
  return platformHasPermission(op.role, 'staff.manage');
}

export function operatorCanReadGuilds(op: PlatformOperator): boolean {
  if (op.kind === 'email') {
    return adminHasPermission(op.role, 'guilds.write') || adminHasPermission(op.role, 'audit.read');
  }
  return platformHasPermission(op.role, 'guilds.read');
}

export function operatorCanUseDevTools(op: PlatformOperator): boolean {
  if (op.kind === 'email') return op.role === 'superadmin';
  return platformHasPermission(op.role, 'dev.tools');
}

export function operatorHasAdminPermission(op: PlatformOperator, permission: AdminPermission): boolean {
  return op.kind === 'email' && adminHasPermission(op.role, permission);
}

export function operatorHasPlatformPermission(op: PlatformOperator, permission: PlatformPermission): boolean {
  return op.kind === 'discord' && platformHasPermission(op.role, permission);
}
