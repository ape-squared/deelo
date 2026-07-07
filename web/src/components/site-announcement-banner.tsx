import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import type { SiteAnnouncement } from '@/lib/site-content';

export function SiteAnnouncementBanner({ announcement }: { announcement: SiteAnnouncement }) {
  return (
    <div className="site-banner">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 lg:px-6">
        <span className="site-banner-pill">
          <Megaphone className="h-3.5 w-3.5" />
          News
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-foreground">{announcement.title}</span>
          {announcement.summary && (
            <span className="hidden text-muted sm:inline"> — {announcement.summary}</span>
          )}
        </p>
        <Link
          href={`/announcements/${announcement.slug}`}
          className="shrink-0 text-xs font-semibold text-accent hover:underline"
        >
          Read more
        </Link>
      </div>
    </div>
  );
}
