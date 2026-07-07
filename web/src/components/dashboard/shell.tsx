'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CreditCard, BookOpen, LogOut, ExternalLink,
  ChevronRight, Plus, Home,
} from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { getInviteUrl } from '@/lib/invite';

export interface DashboardGuild {
  id: string;
  name: string;
  icon: string | null;
  botPresent?: boolean;
  plan?: string;
}

const FOOTER_NAV = [
  { href: '/pricing', label: 'Upgrade', icon: CreditCard },
  { href: '/commands', label: 'Commands', icon: BookOpen },
];

export function DashboardShell({
  children,
  user,
  guilds,
  currentGuild,
  onLogout,
}: {
  children: React.ReactNode;
  user?: { username: string; avatar: string | null } | null;
  guilds?: DashboardGuild[];
  currentGuild?: DashboardGuild | null;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const isGuildPage = pathname.startsWith('/dashboard/') && pathname !== '/dashboard';
  const activeGuilds = (guilds ?? []).filter((g) => g.botPresent !== false);

  return (
    <div className="dashboard-app mesh-bg flex min-h-screen flex-col">
      <header className="dashboard-topbar shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold transition hover:opacity-90">
            <span className="brand-logo-mark">
              <DeeloIcon size={32} />
            </span>
            <span className="hidden sm:inline pt-0.5">
              <DeeloWordmark height={20} />
            </span>
          </Link>
          {currentGuild && (
            <div className="hidden items-center gap-2 border-l border-border pl-4 md:flex">
              <GuildIcon guild={currentGuild} size={28} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{currentGuild.name}</p>
                {currentGuild.plan && (
                  <p className="text-[11px] capitalize text-muted">{currentGuild.plan.replace('_', ' ')}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost hidden text-xs sm:inline-flex">
            <ExternalLink className="h-3.5 w-3.5" />
            Site
          </Link>
          {user && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 py-1 pl-1 pr-3">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-lg" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-xs font-bold text-accent">
                  {user.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="hidden max-w-[120px] truncate text-sm sm:inline">{user.username}</span>
            </div>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout} className="btn-ghost p-2 text-red-400/80 hover:text-red-400" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="server-rail hidden shrink-0 flex-col sm:flex">
          <Link
            href="/dashboard"
            className={`server-rail-btn ${!isGuildPage ? 'server-rail-btn-active' : ''}`}
            title="All servers"
          >
            <Home className="h-5 w-5" />
          </Link>
          <div className="my-2 h-px w-8 bg-border mx-auto" />
          {activeGuilds.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/${g.id}`}
              className={`server-rail-btn ${currentGuild?.id === g.id ? 'server-rail-btn-active' : ''}`}
              title={g.name}
            >
              <GuildIcon guild={g} size={36} rounded="full" />
            </Link>
          ))}
          <a
            href={getInviteUrl()}
            className="server-rail-btn mt-auto text-muted hover:text-accent"
            title="Add to server"
            target="_blank"
            rel="noreferrer"
          >
            <Plus className="h-5 w-5" />
          </a>
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            {FOOTER_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="server-rail-btn text-muted hover:text-foreground" title={label}>
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function GuildIcon({
  guild,
  size = 40,
  rounded = 'xl',
}: {
  guild: { id: string; name: string; icon: string | null };
  size?: number;
  rounded?: 'xl' | 'full';
}) {
  const icon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;
  const roundClass = rounded === 'full' ? 'rounded-full' : 'rounded-xl';

  if (icon) {
    return (
      <Image
        src={icon}
        alt=""
        width={size}
        height={size}
        className={`${roundClass} ring-1 ring-border`}
        unoptimized
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-accent/15 font-bold text-accent ${roundClass}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {guild.name[0]?.toUpperCase()}
    </div>
  );
}

export function PageHeader({ title, description, badge, action }: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="max-w-2xl text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-6 flex items-center gap-1 text-sm text-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-foreground">{item.label}</Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
