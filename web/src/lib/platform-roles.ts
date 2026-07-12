/** Deelo platform staff roles (Discord OAuth /staff portal). */
export type PlatformStaffRole = 'lead' | 'developer' | 'moderator' | 'support';

export const PLATFORM_STAFF_ROLES: PlatformStaffRole[] = ['lead', 'developer', 'moderator', 'support'];

const ROLE_RANK: Record<PlatformStaffRole, number> = {
  support: 1,
  moderator: 2,
  developer: 3,
  lead: 4,
};

export type PlatformPermission =
  | 'staff.read'
  | 'guilds.read'
  | 'guilds.write'
  | 'guilds.dashboard'
  | 'users.read'
  | 'subscriptions.read'
  | 'subscriptions.write'
  | 'redeem.read'
  | 'redeem.write'
  | 'audit.read'
  | 'cms.read'
  | 'cms.write'
  | 'staff.manage'
  | 'dev.tools';

const ROLE_PERMISSIONS: Record<PlatformStaffRole, PlatformPermission[]> = {
  support: ['staff.read', 'guilds.read', 'guilds.dashboard', 'users.read', 'subscriptions.read', 'audit.read'],
  moderator: ['staff.read', 'guilds.read', 'guilds.write', 'guilds.dashboard', 'users.read', 'subscriptions.read', 'redeem.read', 'audit.read'],
  developer: [
    'staff.read', 'guilds.read', 'guilds.write', 'guilds.dashboard', 'users.read',
    'subscriptions.read', 'subscriptions.write', 'redeem.read', 'redeem.write',
    'audit.read', 'cms.read', 'dev.tools',
  ],
  lead: [
    'staff.read', 'staff.manage', 'guilds.read', 'guilds.write', 'guilds.dashboard', 'users.read',
    'subscriptions.read', 'subscriptions.write', 'redeem.read', 'redeem.write',
    'audit.read', 'cms.read', 'cms.write', 'dev.tools',
  ],
};

export function platformRoleRank(role: PlatformStaffRole): number {
  return ROLE_RANK[role];
}

export function platformHasPermission(role: PlatformStaffRole, permission: PlatformPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function platformRoleLabel(role: PlatformStaffRole): string {
  switch (role) {
    case 'lead': return 'Lead';
    case 'developer': return 'Developer';
    case 'moderator': return 'Bot moderator';
    case 'support': return 'Support staff';
  }
}

/** Email admin panel roles (Supabase Auth). */
export type AdminUserRole = 'superadmin' | 'admin' | 'support';

const ADMIN_RANK: Record<AdminUserRole, number> = {
  support: 1,
  admin: 2,
  superadmin: 3,
};

export type AdminPermission =
  | 'analytics'
  | 'website.read'
  | 'website.write'
  | 'guilds.write'
  | 'users.read'
  | 'subscriptions.write'
  | 'redeem.write'
  | 'audit.read';

const ADMIN_PERMISSIONS: Record<AdminUserRole, AdminPermission[]> = {
  support: ['analytics', 'users.read', 'audit.read'],
  admin: ['analytics', 'website.read', 'guilds.write', 'users.read', 'subscriptions.write', 'redeem.write', 'audit.read'],
  superadmin: ['analytics', 'website.read', 'website.write', 'guilds.write', 'users.read', 'subscriptions.write', 'redeem.write', 'audit.read'],
};

export function adminHasPermission(role: AdminUserRole, permission: AdminPermission): boolean {
  return ADMIN_PERMISSIONS[role].includes(permission);
}

export function adminMeetsRole(role: AdminUserRole, minimum: AdminUserRole): boolean {
  return ADMIN_RANK[role] >= ADMIN_RANK[minimum];
}
