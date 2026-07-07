import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentBody } from '@/components/content-body';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { getAnnouncementBySlug } from '@/lib/site-data';
import { formatContentDate } from '@/lib/site-content';
import { ArrowLeft, Pin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getAnnouncementBySlug(slug);
  return { title: post ? `${post.title} — Deelo` : 'Announcement — Deelo' };
}

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getAnnouncementBySlug(slug);
  if (!post) notFound();

  return (
    <MarketingLayout banner={false}>
      <MarketingMain narrow className="!py-12 lg:!py-20">
        <article className="animate-fade-up">
          <Link href="/announcements" className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All announcements
          </Link>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {post.pinned && (
              <span className="badge badge-accent inline-flex items-center gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            <span className="text-sm text-muted">{formatContentDate(post.published_at)}</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          {post.summary && <p className="mb-8 text-lg text-muted">{post.summary}</p>}
          <div className="card p-8">
            <ContentBody body={post.body} />
          </div>
        </article>
      </MarketingMain>
    </MarketingLayout>
  );
}
