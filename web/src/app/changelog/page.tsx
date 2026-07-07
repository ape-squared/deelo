import Link from 'next/link';
import { ContentBody } from '@/components/content-body';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { SitePageHero } from '@/components/marketing/page-hero';
import { getPublishedChangelog } from '@/lib/site-data';
import { CHANGELOG_CATEGORY_COLORS, CHANGELOG_CATEGORY_LABELS, formatContentDate } from '@/lib/site-content';
import { ScrollText } from 'lucide-react';

export const metadata = { title: 'Changelog — Deelo' };
export const dynamic = 'force-dynamic';

export default async function ChangelogPage() {
  const entries = await getPublishedChangelog();

  return (
    <MarketingLayout>
      <MarketingMain narrow className="!py-12 lg:!py-20">
        <SitePageHero
          icon={ScrollText}
          label="Release notes"
          title="Changelog"
          description="Everything new, improved, and fixed in Deelo."
        />

        <div className="relative space-y-0">
          <div className="timeline-line" aria-hidden />
          {entries.map((entry, i) => (
            <article key={entry.id} className="relative animate-fade-up pb-10 pl-10" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="timeline-dot" />
              <div className="card p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {entry.version && (
                    <span className="font-mono text-sm font-semibold text-accent">v{entry.version}</span>
                  )}
                  <span className={`badge border text-xs ${CHANGELOG_CATEGORY_COLORS[entry.category]}`}>
                    {CHANGELOG_CATEGORY_LABELS[entry.category]}
                  </span>
                  <span className="text-xs text-muted">{formatContentDate(entry.published_at)}</span>
                </div>
                <h2 className="mb-3 text-lg font-semibold">{entry.title}</h2>
                <ContentBody body={entry.body} className="text-sm" />
              </div>
            </article>
          ))}
          {!entries.length && (
            <div className="card p-12 text-center text-muted">
              <ScrollText className="mx-auto mb-4 h-10 w-10 opacity-40" />
              <p>No changelog entries yet.</p>
              <Link href="/announcements" className="mt-2 inline-block text-sm text-accent hover:underline">
                View announcements →
              </Link>
            </div>
          )}
        </div>
      </MarketingMain>
    </MarketingLayout>
  );
}
