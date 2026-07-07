import { Activity, Globe, CreditCard, Code2 } from 'lucide-react';
import Link from 'next/link';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffHubCard, StaffPageHeader } from '@/components/staff/ui';
import { platformHasPermission } from '@/lib/platform-roles';

export default async function DeveloperHubPage() {
  const staff = await requireStaffPage('dev.tools');

  return (
    <div>
      <StaffPageHeader
        badge="Developer"
        title="Developer hub"
        description="Bot health, changelog CMS, and subscription grants for platform engineering."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StaffHubCard href="/staff/developer/status" title="Bot status" description="Live gateway ping, guild count, and service payload." icon={Activity} />
        <StaffHubCard href="/staff/developer/changelog" title="Changelog & CMS" description="Manage public changelog entries and site announcements." icon={Globe} />
        {platformHasPermission(staff.role, 'subscriptions.write') && (
          <StaffHubCard href="/staff/developer/subscriptions" title="Grant subscriptions" description="Create or extend premium access for any guild." icon={CreditCard} />
        )}
      </div>
      <div className="mt-8 card p-5 flex items-start gap-3">
        <Code2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm text-muted leading-relaxed">
          <p className="text-foreground font-medium mb-1">Developer tools</p>
          Status pulls from <Link href="/status" className="text-accent hover:underline" target="_blank">/status</Link>.
          Changelog edits sync to the public site and What&apos;s New modal.
        </div>
      </div>
    </div>
  );
}
