'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Users, CreditCard, ScrollText, Shield, LogOut, ExternalLink, Ticket,
  BarChart3, Activity, Globe, Code2, UserCog, Search,
} from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import {
  operatorCanManageStaff,
  operatorCanReadGuilds,
  operatorCanUseDevTools,
  operatorHasAdminPermission,
  type PlatformOperator,
} from '@/lib/platform-operator-shared';
import { platformRoleLabel } from '@/lib/platform-roles';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  show: (op: PlatformOperator) => boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, show: () => true },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, show: (op) => operatorHasAdminPermission(op, 'analytics') },
  { href: '/admin/guild-lookup', label: 'Guild lookup', icon: Search, show: (op) => operatorCanReadGuilds(op) },
  { href: '/admin/website', label: 'Website', icon: Globe, show: (op) => operatorHasAdminPermission(op, 'website.read') },
  { href: '/admin/guilds', label: 'Guild plans', icon: Server, show: (op) => operatorHasAdminPermission(op, 'guilds.write') },
  { href: '/admin/users', label: 'Users', icon: Users, show: (op) => operatorHasAdminPermission(op, 'users.read') },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, show: (op) => operatorHasAdminPermission(op, 'subscriptions.write') },
  { href: '/admin/redeem-codes', label: 'Redeem codes', icon: Ticket, show: (op) => operatorHasAdminPermission(op, 'redeem.write') },
  { href: '/admin/team', label: 'Platform team', icon: UserCog, show: (op) => operatorCanManageStaff(op) },
  { href: '/admin/developers', label: 'Developer', icon: Code2, show: (op) => operatorCanUseDevTools(op) },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText, show: (op) => operatorHasAdminPermission(op, 'audit.read') },
];

export function AdminShell({
  children,
  operator,
}: {
  children: React.ReactNode;
  operator: PlatformOperator;
}) {
  const pathname = usePathname();
  const visibleNav = NAV.filter((item) => item.show(operator));

  const roleLabel =
    operator.kind === 'email'
      ? operator.role
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
          <DeeloIcon size={36} className="shadow-lg shadow-accent/25" />
          <div>
            <DeeloWordmark height={18} />
            <p className="text-[10px] uppercase tracking-widest text-muted">Admin</p>
          </div>
        </div>

        <div className="admin-sidebar-user">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold capitalize text-accent">{roleLabel}</span>
          </div>
          <p className="truncate text-xs text-muted mt-1">{operator.label}</p>
          <p className="text-[10px] text-muted mt-0.5 capitalize">{operator.kind === 'email' ? 'Email login' : 'Discord staff'}</p>
        </div>

        <nav className="admin-nav flex-1 overflow-y-auto px-3 py-2">
          <p className="admin-nav-label">Manage</p>
          {visibleNav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`admin-nav-link ${active ? 'admin-nav-link-active' : ''}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-nav-link text-xs">
            <Server className="h-3.5 w-3.5" />
            Server dashboard
          </Link>
          <Link href="/status" className="admin-nav-link text-xs">
            <Activity className="h-3.5 w-3.5" />
            Public status
          </Link>
          <Link href="/" className="admin-nav-link text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </Link>
          <button type="button" onClick={logout} className="admin-nav-link w-full text-left text-red-400/80 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main animate-fade-in">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
