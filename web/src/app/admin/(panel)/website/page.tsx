import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/ui';
import { WebsiteManager } from '@/components/admin-website';
import { getAllAnnouncementsAdmin, getAllChangelogAdmin, getSiteSettingsAdmin } from '@/lib/site-data';
import { ExternalLink } from 'lucide-react';

export default async function AdminWebsitePage() {
  const [announcements, changelog, settings] = await Promise.all([
    getAllAnnouncementsAdmin(),
    getAllChangelogAdmin(),
    getSiteSettingsAdmin(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Site & changelog"
        badge="Content"
        description="Manage announcements, changelog, Discord widget, and homepage content. Changes sync to the public site immediately."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/announcements" className="btn-secondary text-sm" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Announcements
            </Link>
            <Link href="/changelog" className="btn-secondary text-sm" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Changelog
            </Link>
          </div>
        }
      />
      <WebsiteManager
        initialAnnouncements={announcements}
        initialChangelog={changelog}
        initialSettings={settings}
      />
    </div>
  );
}
