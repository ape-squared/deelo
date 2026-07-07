import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/session';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';
import { platformHasPermission, type PlatformPermission } from '@/lib/platform-roles';

export async function requireStaffPage(permission?: PlatformPermission) {
  const session = await getDashboardSession();
  if (!session) redirect('/staff/login');

  const staff = await getPlatformStaffByDiscordId(session.discordId);
  if (!staff) redirect('/staff/login?error=not_staff');

  if (permission && !platformHasPermission(staff.role, permission)) {
    redirect('/staff?error=forbidden');
  }

  return staff;
}
