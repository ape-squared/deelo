import { Headphones, Search, Users, CreditCard, ScrollText, LayoutDashboard } from 'lucide-react';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffHubCard, StaffPageHeader } from '@/components/staff/ui';

export default async function SupportHubPage() {
  await requireStaffPage('guilds.read');

  return (
    <div>
      <StaffPageHeader
        badge="Support staff"
        title="Support hub"
        description="Investigate guilds, dashboard users, and subscription status when helping server owners."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StaffHubCard href="/staff/support/guilds" title="Guild lookup" description="Search by snowflake ID, view plan and active subscription." icon={Search} />
        <StaffHubCard href="/staff/support/dashboard-access" title="Dashboard access" description="Open a user's server dashboard to troubleshoot settings and modules." icon={LayoutDashboard} />
        <StaffHubCard href="/staff/support/users" title="User lookup" description="Browse Discord users who signed into the dashboard." icon={Users} />
        <StaffHubCard href="/staff/support/subscriptions" title="Subscriptions" description="Read-only view of premium grants and expirations." icon={CreditCard} />
        <StaffHubCard href="/staff/support/audit" title="Audit log" description="Review recent platform actions for troubleshooting." icon={ScrollText} />
      </div>
      <div className="mt-8 card p-5 flex items-start gap-3">
        <Headphones className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm text-muted leading-relaxed">
          <p className="text-foreground font-medium mb-1">Support workflow</p>
          Start with guild lookup to confirm plan state, then check subscriptions if premium access looks wrong. Use user lookup when the issue is dashboard login or ownership.
        </div>
      </div>
    </div>
  );
}
