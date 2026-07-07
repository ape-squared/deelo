import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/session';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';
import { StaffShell } from '@/components/staff/shell';

export default async function StaffPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();
  if (!session) redirect('/staff/login');

  const staff = await getPlatformStaffByDiscordId(session.discordId);
  if (!staff) redirect('/staff/login?error=not_staff');

  return (
    <StaffShell staff={{ username: staff.username, role: staff.role, discordId: staff.discordId }}>
      {children}
    </StaffShell>
  );
}
