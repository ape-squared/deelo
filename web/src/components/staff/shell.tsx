'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Users, Shield, LogOut, ExternalLink, Wrench, Headphones, Code2, UserCog,
} from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { platformHasPermission, platformRoleLabel, type PlatformPermission, type PlatformStaffRole } from '@/lib/platform-roles';

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; permission: PlatformPermission; exact?: boolean }[] = [
  { href: '/staff', label: 'Overview', icon: LayoutDashboard, permission: 'staff.read', exact: true },
  { href: '/staff/guilds', label: 'Guild lookup', icon: Server, permission: 'guilds.read' },
  { href: '/staff/users', label: 'Dashboard users', icon: Users, permission: 'users.read' },
  { href: '/staff/support', label: 'Support tools', icon: Headphones, permission: 'guilds.read' },
  { href: '/staff/developers', label: 'Developer', icon: Code2, permission: 'dev.tools' },
  { href: '/staff/team', label: 'Platform team', icon: UserCog, permission: 'staff.manage' },
];

export function StaffShell({
  children,
  staff,
}: {
  children: React.ReactNode;
  staff: { username: string; role: PlatformStaffRole; discordId: string };
}) {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/staff';
  }

  const visibleNav = NAV.filter((item) => platformHasPermission(staff.role, item.permission));

  return (
    <div className="staff-app mesh-bg v3-mesh flex min-h-screen">
      <aside className="staff-sidebar">
        <div className="staff-sidebar-brand">
          <DeeloIcon size={36} className="shadow-lg shadow-accent/25" />
          <div>
            <DeeloWordmark height={18} />
            <p className="text-[10px] uppercase tracking-widest text-accent-bright">Staff v3</p>
          </div>
        </div>

        <div className="staff-sidebar-user">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-accent-bright" />
            <span className="text-xs font-semibold text-accent-bright">{platformRoleLabel(staff.role)}</span>
          </div>
          <p className="truncate text-xs text-muted mt-1">{staff.username}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {visibleNav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`staff-nav-link ${active ? 'staff-nav-link-active' : ''}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="staff-sidebar-footer space-y-0.5">
          <Link href="/dashboard" className="staff-nav-link text-xs">
            <Wrench className="h-3.5 w-3.5" />
            Server dashboard
          </Link>
          <Link href="/admin" className="staff-nav-link text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            Admin panel
          </Link>
          <button type="button" onClick={logout} className="staff-nav-link w-full text-left text-red-400/80 hover:text-red-400">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="staff-main animate-fade-in">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
