import { Server, Ticket, Shield } from 'lucide-react';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffHubCard, StaffPageHeader } from '@/components/staff/ui';

export default async function ModeratorHubPage() {
  await requireStaffPage('guilds.write');

  return (
    <div>
      <StaffPageHeader
        badge="Bot moderator"
        title="Moderator hub"
        description="Manage guild plans, review redeem codes, and keep premium access aligned with platform policy."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StaffHubCard href="/staff/moderator/guilds" title="Guild plans" description="Update server plan tier and sync subscriptions." icon={Server} />
        <StaffHubCard href="/staff/moderator/redeem" title="Redeem codes" description="View promo codes, usage counts, and disable abused codes." icon={Ticket} />
      </div>
      <div className="mt-8 card p-5 flex items-start gap-3">
        <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm text-muted leading-relaxed">
          <p className="text-foreground font-medium mb-1">Moderator scope</p>
          Plan changes are logged to the audit trail. Developers can create new redeem codes; moderators can review and disable them.
        </div>
      </div>
    </div>
  );
}
