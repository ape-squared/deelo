import { MarketingLayout } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { SuggestionsBoard } from '@/components/suggestions/suggestions-view';
import { Lightbulb } from 'lucide-react';

export const metadata = { title: 'Feature Requests — Deelo' };

export default function SuggestionsPage() {
  return (
    <MarketingLayout banner={false}>
      <main className="flex-1">
        <MarketingSubHero
          icon={Lightbulb}
          label="Community"
          title="Feature Requests"
          description="Suggest features, vote on ideas, and help shape what Deelo builds next. Sign in with Discord and join our server to participate."
        />
        <section className="site-section !pt-0">
          <SuggestionsBoard />
        </section>
      </main>
    </MarketingLayout>
  );
}
