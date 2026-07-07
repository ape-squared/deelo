import { NextResponse } from 'next/server';
import { getDashboardSession } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  platformHasPermission,
  type PlatformPermission,
  type PlatformStaffRole,
} from '@/lib/platform-roles';

export interface PlatformStaffUser {
  discordId: string;
  username: string;
  avatar: string | null;
  role: PlatformStaffRole;
  displayName: string | null;
  source: 'database' | 'owner';
}

function ownerDiscordIds(): string[] {
  const raw = process.env.OWNER_IDS ?? process.env.PLATFORM_OWNER_IDS ?? '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function getPlatformStaffByDiscordId(discordId: string): Promise<PlatformStaffUser | null> {
  if (ownerDiscordIds().includes(discordId)) {
    const session = await getDashboardSession();
    return {
      discordId,
      username: session?.username ?? 'Owner',
      avatar: session?.avatar ?? null,
      role: 'lead',
      displayName: 'Bot Owner',
      source: 'owner',
    };
  }

  const { data } = await createAdminClient()
    .from('platform_staff')
    .select('discord_id, role, display_name')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!data) return null;

  const session = await getDashboardSession();
  return {
    discordId: data.discord_id,
    username: session?.discordId === discordId ? session.username : data.display_name ?? 'Staff',
    avatar: session?.discordId === discordId ? session.avatar : null,
    role: data.role as PlatformStaffRole,
    displayName: data.display_name,
    source: 'database',
  };
}

export async function requirePlatformStaff(permission?: PlatformPermission) {
  const session = await getDashboardSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const staff = await getPlatformStaffByDiscordId(session.discordId);
  if (!staff) {
    return { error: NextResponse.json({ error: 'Forbidden — not platform staff' }, { status: 403 }) };
  }

  if (permission && !platformHasPermission(staff.role, permission)) {
    return { error: NextResponse.json({ error: 'Insufficient staff permissions' }, { status: 403 }) };
  }

  if (staff.source === 'database') {
    void createAdminClient()
      .from('platform_staff')
      .update({ last_login: new Date().toISOString() })
      .eq('discord_id', staff.discordId);
  }

  return { session, staff };
}

export async function logStaffAction(
  discordId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  await createAdminClient().from('admin_audit_log').insert({
    admin_id: null,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: { staff_discord_id: discordId, ...metadata },
  });
}
