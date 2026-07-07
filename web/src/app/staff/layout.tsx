import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/session';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';
import { StaffShell } from '@/components/staff/shell';
import { platformHasPermission } from '@/lib/platform-roles';
import Link from 'next/link';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();
  if (!session) {
    return (
      <div className="staff-app mesh-bg v3-mesh flex min-h-screen items-center justify-center px-4">
        <div className="card gradient-border w-full max-w-md p-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Deelo Staff</h1>
          <p className="text-muted mb-8 text-sm">Official staff portal for support, moderation, and development.</p>
          <a href="/api/auth/discord?return=/staff" className="btn-primary w-full">Sign in with Discord</a>
          <Link href="/" className="btn-ghost mt-4 inline-flex text-sm">Back to site</Link>
        </div>
      </div>
    );
  }

  const staff = await getPlatformStaffByDiscordId(session.discordId);
  if (!staff) {
    return (
      <div className="staff-app mesh-bg v3-mesh flex min-h-screen items-center justify-center px-4">
        <div className="card w-full max-w-md p-10 text-center">
          <h1 className="text-xl font-bold mb-2">Access denied</h1>
          <p className="text-muted text-sm mb-6">Your Discord account is not on the Deelo staff roster.</p>
          <Link href="/dashboard" className="btn-secondary text-sm">Server dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <StaffShell staff={{ username: staff.username, role: staff.role, discordId: staff.discordId }}>
      {children}
    </StaffShell>
  );
}
