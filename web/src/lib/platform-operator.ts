import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin';
import { getDashboardSession } from '@/lib/session';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';
import {
  type AdminPermission,
  type PlatformPermission,
} from '@/lib/platform-roles';
import {
  type PlatformOperator,
  operatorCanManageStaff,
  operatorCanReadGuilds,
  operatorCanUseDevTools,
  operatorHasAdminPermission,
  operatorHasPlatformPermission,
} from '@/lib/platform-operator-shared';

export type { PlatformOperator } from '@/lib/platform-operator-shared';
export {
  operatorCanManageStaff,
  operatorCanReadGuilds,
  operatorCanUseDevTools,
  operatorHasAdminPermission,
  operatorHasPlatformPermission,
} from '@/lib/platform-operator-shared';

export async function getPlatformOperator(): Promise<PlatformOperator | null> {
  const admin = await getAdminUser();
  if (admin) {
    return { kind: 'email', id: admin.id, label: admin.email, role: admin.role };
  }

  const session = await getDashboardSession();
  if (!session) return null;

  const staff = await getPlatformStaffByDiscordId(session.discordId);
  if (!staff) return null;

  return {
    kind: 'discord',
    id: staff.discordId,
    label: staff.displayName ?? staff.username,
    role: staff.role,
  };
}

export async function requirePlatformOperator(options: {
  adminPermission?: AdminPermission;
  platformPermission?: PlatformPermission;
  manageStaff?: boolean;
  readGuilds?: boolean;
  devTools?: boolean;
}) {
  const op = await getPlatformOperator();
  if (!op) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (options.manageStaff && !operatorCanManageStaff(op)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (options.readGuilds && !operatorCanReadGuilds(op)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (options.devTools && !operatorCanUseDevTools(op)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (options.adminPermission && !operatorHasAdminPermission(op, options.adminPermission)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (options.platformPermission && !operatorHasPlatformPermission(op, options.platformPermission)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { operator: op };
}
