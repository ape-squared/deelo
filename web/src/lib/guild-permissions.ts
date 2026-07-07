import type { ModuleId } from '@/lib/dashboard-modules';

export type GuildDashboardRole = 'owner' | 'admin' | 'moderator' | 'viewer';

const ROLE_RANK: Record<GuildDashboardRole, number> = {
  viewer: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

const MODERATOR_MODULES: ModuleId[] = [
  'overview', 'welcome', 'moderation', 'filters', 'responders', 'autoreact', 'events',
];

export function guildRoleCanRead(role: GuildDashboardRole, module: ModuleId): boolean {
  if (module === 'team') return role === 'owner' || role === 'admin';
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'moderator') return MODERATOR_MODULES.includes(module);
  return module === 'overview';
}

export function guildRoleCanWrite(role: GuildDashboardRole, module: ModuleId): boolean {
  if (module === 'team') return role === 'owner' || role === 'admin';
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'moderator') return MODERATOR_MODULES.includes(module) && module !== 'overview';
  return false;
}

export function guildMeetsRole(role: GuildDashboardRole, minimum: GuildDashboardRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
