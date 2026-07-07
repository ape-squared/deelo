import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { platformHasPermission, platformRoleLabel } from '@/lib/platform-roles';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffHubCard, StaffPageHeader, StaffStatCard } from '@/components/staff/ui';
import { STAFF_NAV_SECTIONS } from '@/lib/staff-nav';
import { Search, Users, CreditCard, Shield, Code2, UserCog, Headphones } from 'lucide-react';

export default async function StaffOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaffPage('staff.read');
  const params = await searchParams;

  const db = createAdminClient();
  const [{ count: guildCount }, { count: userCount }, { count: activeSubs }] = await Promise.all([
    db.from('guilds').select('*', { count: 'exact', head: true }),
    db.from('dashboard_users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const sections = STAFF_NAV_SECTIONS.filter((s) => s.id !== 'overview').map((section) => ({
    ...section,
    items: section.items.filter((item) => platformHasPermission(staff.role, item.permission)),
  })).filter((s) => s.items.length > 0);

  const sectionIcons: Record<string, typeof Headphones> = {
    support: Headphones,
    moderator: Shield,
    developer: Code2,
    leadership: UserCog,
  };

  return (
    <div>
      <StaffPageHeader
        badge="Staff portal"
        title={`Welcome, ${staff.displayName ?? staff.username}`}
        description={`Signed in as ${platformRoleLabel(staff.role)}. Use the sidebar sections for your role — support staff, bot moderator, and developer tools are grouped separately.`}
      />

      {params.error === 'forbidden' && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          You don&apos;t have permission for that page. Use the tools available for your role below.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <StaffStatCard label="Registered guilds" value={guildCount ?? 0} />
        <StaffStatCard label="Dashboard users" value={userCount ?? 0} />
        <StaffStatCard label="Active subscriptions" value={activeSubs ?? 0} />
      </div>

      {sections.map((section) => {
        const Icon = sectionIcons[section.id] ?? Headphones;
        const hubHref = section.items[0]?.href ?? '/staff';
        return (
          <div key={section.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Icon className="h-5 w-5 text-accent" />
                {section.label}
              </h2>
              <Link href={hubHref} className="text-xs text-accent hover:underline">Open hub →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <StaffHubCard
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  description={`${section.label} tool`}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        );
      })}

      {platformHasPermission(staff.role, 'guilds.read') && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">Quick guild lookup</p>
            <p className="text-sm text-muted mt-1">Jump straight to server search and subscription details.</p>
          </div>
          <Link href="/staff/support/guilds" className="btn-secondary text-sm">
            <Search className="h-4 w-4" />
            Guild lookup
          </Link>
        </div>
      )}
    </div>
  );
}
