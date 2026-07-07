import { config } from '../config';
import { getSupabase } from '../database/supabase';

export type PlatformStaffRole = 'lead' | 'developer' | 'moderator' | 'support';

const cache = new Map<string, { role: PlatformStaffRole; expires: number }>();
const CACHE_MS = 60_000;

export function isBotOwner(userId: string): boolean {
  return config.ownerIds.includes(userId);
}

export async function getPlatformStaffRole(userId: string): Promise<PlatformStaffRole | null> {
  if (isBotOwner(userId)) return 'lead';

  const cached = cache.get(userId);
  if (cached && Date.now() < cached.expires) return cached.role;

  const { data } = await getSupabase()
    .from('platform_staff')
    .select('role')
    .eq('discord_id', userId)
    .maybeSingle();

  if (!data?.role) return null;
  const role = data.role as PlatformStaffRole;
  cache.set(userId, { role, expires: Date.now() + CACHE_MS });
  return role;
}

export async function isPlatformStaff(userId: string): Promise<boolean> {
  return (await getPlatformStaffRole(userId)) !== null;
}

export function staffMeetsRole(role: PlatformStaffRole, minimum: PlatformStaffRole): boolean {
  const rank: Record<PlatformStaffRole, number> = { support: 1, moderator: 2, developer: 3, lead: 4 };
  return rank[role] >= rank[minimum];
}
