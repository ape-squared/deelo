'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogOut, ExternalLink, Wrench } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { platformHasPermission, platformRoleLabel, type PlatformStaffRole } from '@/lib/platform-roles';
import { STAFF_NAV_SECTIONS } from '@/lib/staff-nav';

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
    window.location.href = '/staff/login';
  }

  const sections = STAFF_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => platformHasPermission(staff.role, item.permission)),
  })).filter((section) => section.items.length > 0);

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

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section) => (
            <div key={section.id} className="mb-4 last:mb-0">
              {section.id !== 'overview' && (
                <p className="staff-nav-label">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`staff-nav-link ${active ? 'staff-nav-link-active' : ''}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="staff-sidebar-footer space-y-0.5">
          <Link href="/dashboard" className="staff-nav-link text-xs">
            <Wrench className="h-3.5 w-3.5" />
            Server dashboard
          </Link>
          <Link href="/status" className="staff-nav-link text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            Public status
          </Link>
          <Link href="/" className="staff-nav-link text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </Link>
          <button type="button" onClick={logout} className="staff-nav-link w-full text-left text-red-400/80 hover:text-red-400">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="staff-main animate-fade-in">
        <div className="mx-auto max-w-6xl module-content-pad">{children}</div>
      </main>
    </div>
  );
}
