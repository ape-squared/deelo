'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CreditCard, BookOpen, LogOut, ExternalLink,
  ChevronRight, Plus, Home,
} from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { inviteApiPath } from '@/lib/invite';
import { dashboardRedeemPath } from '@/lib/dashboard-paths';
import { DashPageHeader, DashUserChip } from '@/components/ui/dashboard-kit';

export interface DashboardGuild {
  id: string;
  name: string;
  icon: string | null;
  botPresent?: boolean;
  plan?: string;
}

const FOOTER_NAV = [
  { href: '/commands', label: 'Commands', icon: BookOpen },
] as const;

export function DashboardShell({
  children,
  user,
  guilds,
  currentGuild,
  onLogout,
  dashboardRole,
}: {
  children: React.ReactNode;
  user?: { username: string; avatar: string | null } | null;
  guilds?: DashboardGuild[];
  currentGuild?: DashboardGuild | null;
  onLogout?: () => void;
  dashboardRole?: string;
}) {
  const pathname = usePathname();
  const isGuildPage = pathname.startsWith('/dashboard/') && pathname !== '/dashboard';
  const activeGuilds = (guilds ?? []).filter((g) => g.botPresent !== false);
  const redeemHref = currentGuild ? dashboardRedeemPath(currentGuild.id) : dashboardRedeemPath();

  return (
    <div className="dashboard-app mesh-bg v3-mesh flex min-h-screen flex-col" data-theme="dark">
      <header className="dashboard-topbar shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold transition hover:opacity-90">
            <span className="brand-logo-mark">
              <DeeloIcon size={32} />
            </span>
            <span className="hidden sm:inline pt-0.5">
              <DeeloWordmark height={20} />
            </span>
            <span className="hidden md:inline-flex">
              <Chip size="sm" color="accent" variant="soft">v3</Chip>
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
                {dashboardRole && dashboardRole !== 'admin' && dashboardRole !== 'owner' && (
                  <p className="text-[10px] capitalize text-accent-bright">{dashboardRole} access</p>
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
          {user && <DashUserChip username={user.username} avatar={user.avatar} />}
          {onLogout && (
            <Button type="button" variant="ghost" size="sm" isIconOnly onPress={onLogout} className="text-danger" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="server-rail">
          <Link
            href="/dashboard"
            className={`server-rail-btn mx-auto mt-3 ${!isGuildPage ? 'server-rail-btn-active' : ''}`}
            title="All servers"
          >
            <Home className="h-5 w-5" />
          </Link>
          <div className="my-2 h-px w-8 bg-border mx-auto shrink-0" />
          <div className="server-rail-scroll">
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
          </div>
          <div className="server-rail-footer">
            <a
              href={inviteApiPath()}
              className="server-rail-btn text-muted hover:text-accent"
              title="Add to server"
              target="_blank"
              rel="noreferrer"
            >
              <Plus className="h-5 w-5" />
            </a>
            <Link href={redeemHref} className="server-rail-btn text-muted hover:text-foreground" title="Redeem code">
              <CreditCard className="h-4 w-4" />
            </Link>
            {FOOTER_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="server-rail-btn text-muted hover:text-foreground" title={label}>
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
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

export function PageHeader(props: React.ComponentProps<typeof DashPageHeader>) {
  return <DashPageHeader {...props} />;
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
