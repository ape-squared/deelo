'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogOut, ExternalLink, Activity, LayoutGrid } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { platformRoleLabel } from '@/lib/platform-roles';
import type { PlatformOperator } from '@/lib/platform-operator-shared';
import { visibleAdminSections } from '@/lib/admin-nav';

export function AdminShell({
  children,
  operator,
}: {
  children: React.ReactNode;
  operator: PlatformOperator;
}) {
  const pathname = usePathname();
  const sections = visibleAdminSections(operator);

  const roleLabel =
    operator.kind === 'email'
      ? operator.role === 'superadmin'
        ? 'Superadmin'
        : operator.role
      : platformRoleLabel(operator.role);

  async function logout() {
    if (operator.kind === 'email') {
      await fetch('/api/admin/logout', { method: 'POST' });
    } else {
      await fetch('/api/auth/logout', { method: 'POST' });
    }
    window.location.href = '/admin/login';
  }

  return (
    <div className="admin-app mesh-bg v3-mesh flex min-h-screen">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">
            <DeeloIcon size={32} className="shadow-lg shadow-accent/25" />
          </div>
          <div className="min-w-0">
            <DeeloWordmark height={17} />
            <p className="admin-sidebar-tag">Control panel</p>
          </div>
        </div>

        <div className="admin-sidebar-user">
          <div className="flex items-center gap-2">
            <span className="admin-role-pill">
              <Shield className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
          <p className="truncate text-xs text-foreground/90 mt-2 font-medium">{operator.label}</p>
          <p className="text-[10px] text-muted mt-0.5 capitalize">
            {operator.kind === 'email' ? 'Email session' : 'Discord staff'}
          </p>
        </div>

        <nav className="admin-nav flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section) => (
            <div key={section.id} className="mb-5 last:mb-0">
              <p className="admin-nav-label">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`admin-nav-link ${active ? 'admin-nav-link-active' : ''}`}
                    >
                      <span className="admin-nav-icon">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-nav-link admin-nav-link-muted text-xs">
            <LayoutGrid className="h-3.5 w-3.5" />
            Server dashboard
          </Link>
          <Link href="/staff" className="admin-nav-link admin-nav-link-muted text-xs">
            <Shield className="h-3.5 w-3.5" />
            Staff portal
          </Link>
          <Link href="/status" className="admin-nav-link admin-nav-link-muted text-xs">
            <Activity className="h-3.5 w-3.5" />
            Public status
          </Link>
          <Link href="/" className="admin-nav-link admin-nav-link-muted text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="admin-nav-link admin-nav-link-danger w-full text-left text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main animate-fade-in">
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  );
}
