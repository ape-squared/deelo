import Link from 'next/link';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { SuggestionDetail } from '@/components/suggestions/suggestions-view';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SuggestionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <MarketingLayout>
      <MarketingMain narrow className="!py-12 lg:!py-20">
        <Link href="/suggestions" className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          All suggestions
        </Link>
        <SuggestionDetail slug={slug} />
      </MarketingMain>
    </MarketingLayout>
  );
}
