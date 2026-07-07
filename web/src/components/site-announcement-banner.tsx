import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import type { SiteAnnouncement } from '@/lib/site-content';

export function SiteAnnouncementBanner({ announcement }: { announcement: SiteAnnouncement }) {
  return (
    <div className="border-b border-accent/20 bg-accent-soft/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 lg:px-6">
        <Megaphone className="h-4 w-4 shrink-0 text-accent" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-foreground">{announcement.title}</span>
          {announcement.summary && (
            <span className="text-muted"> — {announcement.summary}</span>
          )}
        </p>
        <Link
          href={`/announcements/${announcement.slug}`}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          Read more
        </Link>
      </div>
    </div>
  );
}
