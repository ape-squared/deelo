'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Users, CreditCard, ScrollText, Shield, LogOut, ExternalLink, Ticket, BarChart3, Activity, Globe,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/website', label: 'Website', icon: Globe },
  { href: '/admin/guilds', label: 'Guilds', icon: Server },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/redeem-codes', label: 'Redeem Codes', icon: Ticket },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export function AdminShell({
  children,
  email,
  role,
}: {
  children: React.ReactNode;
  email: string;
  role: string;
}) {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <div className="admin-app mesh-bg flex min-h-screen">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src="/brand/logo-icon.png" alt="Deelo" className="h-9 w-9 rounded-xl shadow-lg shadow-accent/30" />
          <div>
            <p className="text-sm font-bold leading-tight">Deelo</p>
            <p className="text-[10px] uppercase tracking-widest text-muted">Admin</p>
          </div>
        </div>

        <div className="admin-sidebar-user">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold capitalize text-accent">{role}</span>
          </div>
          <p className="truncate text-xs text-muted mt-1">{email}</p>
        </div>

        <nav className="admin-nav flex-1 overflow-y-auto px-3 py-2">
          <p className="admin-nav-label">Manage</p>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
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
