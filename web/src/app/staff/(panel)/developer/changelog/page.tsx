import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';
import { WebsiteManager } from '@/components/admin-website';
import { getAllAnnouncementsAdmin, getAllChangelogAdmin, getSiteSettingsAdmin } from '@/lib/site-data';
import { platformHasPermission } from '@/lib/platform-roles';

export default async function DeveloperChangelogPage() {
  const staff = await requireStaffPage('cms.read');
  const canWrite = platformHasPermission(staff.role, 'cms.write');

  const [announcements, changelog, settings] = await Promise.all([
    getAllAnnouncementsAdmin(),
    getAllChangelogAdmin(),
    getSiteSettingsAdmin(),
  ]);

  return (
    <div>
      <StaffPageHeader
        badge="Developer"
        title="Changelog & CMS"
        description={canWrite
          ? 'Edit announcements, changelog entries, and homepage settings. Changes go live immediately.'
          : 'Read-only view of site content. Leads can edit entries from this page.'}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/changelog" className="btn-secondary text-sm" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Public changelog
            </Link>
          </div>
        }
      />
      {canWrite ? (
        <WebsiteManager
          initialAnnouncements={announcements}
          initialChangelog={changelog}
          initialSettings={settings}
        />
      ) : (
        <div className="card p-6 space-y-4">
          <p className="text-sm text-muted">{changelog.length} changelog entries · {announcements.length} announcements</p>
          <ul className="divide-y divide-border/50 text-sm">
            {changelog.slice(0, 12).map((entry) => (
              <li key={entry.id} className="py-3 flex justify-between gap-4">
                <span className="font-medium">{entry.title}</span>
                <span className="text-muted text-xs shrink-0">{entry.version ?? entry.published_at?.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
