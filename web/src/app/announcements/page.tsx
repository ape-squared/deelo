import Link from 'next/link';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { getPublishedAnnouncements } from '@/lib/site-data';
import { formatContentDate } from '@/lib/site-content';
import { Megaphone, Pin, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Announcements — Deelo' };
export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const announcements = await getPublishedAnnouncements();

  return (
    <MarketingLayout banner={false}>
      <MarketingSubHero
        icon={Megaphone}
        label="Official updates"
        title="Announcements"
        description="News, maintenance notices, and product updates from the Deelo team."
      />
      <MarketingMain narrow className="!py-12 lg:!py-20">
        <div className="space-y-4">
          {announcements.map((a, i) => (
            <Link
              key={a.id}
              href={`/announcements/${a.slug}`}
              className="card card-glow group block animate-fade-up p-6 transition hover:border-accent/30"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {a.pinned && (
                      <span className="badge badge-accent inline-flex items-center gap-1 text-xs">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}
                    <span className="text-xs text-muted">{formatContentDate(a.published_at)}</span>
                  </div>
                  <h2 className="text-lg font-semibold transition group-hover:text-accent">{a.title}</h2>
                  {a.summary && <p className="mt-2 line-clamp-2 text-sm text-muted">{a.summary}</p>}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:text-accent" />
              </div>
            </Link>
          ))}
          {!announcements.length && (
            <div className="card p-12 text-center text-muted">
              <Megaphone className="mx-auto mb-4 h-10 w-10 opacity-40" />
              <p>No announcements yet. Check back soon or join our Discord.</p>
            </div>
          )}
        </div>
      </MarketingMain>
    </MarketingLayout>
  );
}
