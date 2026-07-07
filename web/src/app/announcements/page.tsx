import Link from 'next/link';
import { SiteFooter, SiteHeader, SiteTopBanner } from '@/components/site-chrome';
import { getPublishedAnnouncements } from '@/lib/site-data';
import { formatContentDate } from '@/lib/site-content';
import { Megaphone, Pin, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Announcements — Deelo' };
export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const announcements = await getPublishedAnnouncements();

  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      <SiteTopBanner />
      <SiteHeader />
      <main className="flex-1 px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 animate-fade-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-sm text-accent">
              <Megaphone className="h-4 w-4" />
              Official updates
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Announcements</h1>
            <p className="mt-3 text-muted">News, maintenance notices, and product updates from the Deelo team.</p>
          </div>

          <div className="space-y-4">
            {announcements.map((a, i) => (
              <Link
                key={a.id}
                href={`/announcements/${a.slug}`}
                className="card card-glow group block p-6 animate-fade-up transition hover:border-accent/30"
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
                    <h2 className="text-lg font-semibold group-hover:text-accent transition">{a.title}</h2>
                    {a.summary && <p className="mt-2 text-sm text-muted line-clamp-2">{a.summary}</p>}
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted group-hover:text-accent transition" />
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
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
