import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { GuildDashboardRole } from '@/lib/guild-permissions';
import type { PlatformStaffRole } from '@/lib/platform-roles';
import { getSessionSecret } from '@/lib/runtime-env';

const COOKIE = 'deelo_staff_guild';
const MAX_AGE_SEC = 60 * 60; // 1 hour

export interface StaffDashboardElevation {
  staffDiscordId: string;
  guildId: string;
  reason: string | null;
  grantedAt: string;
}

function secret() {
  return new TextEncoder().encode(getSessionSecret());
}

export function staffRoleToDashboardRole(staffRole: PlatformStaffRole): GuildDashboardRole {
  switch (staffRole) {
    case 'lead':
    case 'developer':
      return 'admin';
    case 'moderator':
      return 'moderator';
    case 'support':
    default:
      return 'viewer';
  }
}

export async function setStaffDashboardElevation(elevation: StaffDashboardElevation): Promise<void> {
  const token = await new SignJWT({ ...elevation })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

export async function getStaffDashboardElevation(): Promise<StaffDashboardElevation | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const staffDiscordId = String(payload.staffDiscordId ?? '');
    const guildId = String(payload.guildId ?? '');
    if (!staffDiscordId || !guildId) return null;
    return {
      staffDiscordId,
      guildId,
      reason: typeof payload.reason === 'string' ? payload.reason : null,
      grantedAt: typeof payload.grantedAt === 'string' ? payload.grantedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearStaffDashboardElevation(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
