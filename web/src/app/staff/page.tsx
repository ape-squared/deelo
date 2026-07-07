import Link from 'next/link';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';
import { getDashboardSession } from '@/lib/session';
import { platformHasPermission, platformRoleLabel } from '@/lib/platform-roles';
import { Shield, Server, Headphones, Code2 } from 'lucide-react';

export default async function StaffHomePage() {
  const session = await getDashboardSession();
  const staff = session ? await getPlatformStaffByDiscordId(session.discordId) : null;
  if (!staff) return null;

  const cards = [
    { href: '/staff/guilds', label: 'Guild lookup', desc: 'Search servers by ID', icon: Server, permission: 'guilds.read' as const },
    { href: '/staff/support', label: 'Support', desc: 'Help users and inspect guilds', icon: Headphones, permission: 'guilds.read' as const },
    { href: '/staff/developers', label: 'Developer', desc: 'Bot health and diagnostics', icon: Code2, permission: 'dev.tools' as const },
    { href: '/staff/team', label: 'Platform team', desc: 'Manage staff roster', icon: Shield, permission: 'staff.manage' as const },
  ].filter((c) => platformHasPermission(staff.role, c.permission));

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright mb-2">Staff portal v3</p>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {staff.displayName ?? staff.username}</h1>
        <p className="text-muted mt-2">
          Signed in as <span className="text-foreground font-medium">{platformRoleLabel(staff.role)}</span>
          {staff.source === 'owner' ? ' (bot owner)' : ''}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="card card-glow p-6 transition hover:border-accent/40">
            <Icon className="h-8 w-8 text-accent mb-4" />
            <h2 className="font-semibold text-lg">{label}</h2>
            <p className="text-sm text-muted mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 card p-6">
        <h2 className="font-semibold mb-2">Permission model</h2>
        <ul className="text-sm text-muted space-y-1">
          <li><strong className="text-foreground">Support</strong> — read guilds, users, audit</li>
          <li><strong className="text-foreground">Moderator</strong> — + guild plan edits, redeem lookup</li>
          <li><strong className="text-foreground">Developer</strong> — + subscriptions, dev tools, CMS read</li>
          <li><strong className="text-foreground">Lead</strong> — full staff + CMS write + team management</li>
        </ul>
      </div>
    </div>
  );
}
