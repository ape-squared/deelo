import Link from 'next/link';
import { SiteFooter, SiteHeader, SiteTopBanner } from '@/components/site-chrome';
import { ContentBody } from '@/components/content-body';
import { getPublishedChangelog } from '@/lib/site-data';
import { CHANGELOG_CATEGORY_COLORS, CHANGELOG_CATEGORY_LABELS, formatContentDate } from '@/lib/site-content';
import { ScrollText } from 'lucide-react';

export const metadata = { title: 'Changelog — Deelo' };
export const dynamic = 'force-dynamic';

export default async function ChangelogPage() {
  const entries = await getPublishedChangelog();

  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      <SiteTopBanner />
      <SiteHeader />
      <main className="flex-1 px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 animate-fade-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-sm text-accent">
              <ScrollText className="h-4 w-4" />
              Release notes
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Changelog</h1>
            <p className="mt-3 text-muted">Everything new, improved, and fixed in Deelo.</p>
          </div>

          <div className="relative space-y-0">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />
            {entries.map((entry, i) => (
              <article key={entry.id} className="relative pl-10 pb-10 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full border-2 border-accent bg-background" />
                <div className="card p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {entry.version && (
                      <span className="font-mono text-sm font-semibold text-accent">v{entry.version}</span>
                    )}
                    <span className={`badge text-xs border ${CHANGELOG_CATEGORY_COLORS[entry.category]}`}>
                      {CHANGELOG_CATEGORY_LABELS[entry.category]}
                    </span>
                    <span className="text-xs text-muted">{formatContentDate(entry.published_at)}</span>
                  </div>
                  <h2 className="text-lg font-semibold mb-3">{entry.title}</h2>
                  <ContentBody body={entry.body} className="text-sm" />
                </div>
              </article>
            ))}
            {!entries.length && (
              <div className="card p-12 text-center text-muted">
                <ScrollText className="mx-auto mb-4 h-10 w-10 opacity-40" />
                <p>No changelog entries yet.</p>
                <Link href="/announcements" className="text-accent hover:underline text-sm mt-2 inline-block">
                  View announcements →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
