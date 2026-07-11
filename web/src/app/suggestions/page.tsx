import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { SuggestionsBoard } from '@/components/suggestions/suggestions-view';
import { Lightbulb } from 'lucide-react';

export const metadata = { title: 'Feature Requests — Deelo' };

export default function SuggestionsPage() {
  return (
    <MarketingLayout>
      <MarketingSubHero
        icon={Lightbulb}
        label="Community"
        title="Feature Requests"
        description="Suggest features, vote on ideas, and help shape what Deelo builds next. Sign in with Discord and join our server to participate."
      />
      <MarketingMain medium className="!pt-0 !pb-16 lg:!pb-24">
        <SuggestionsBoard />
      </MarketingMain>
    </MarketingLayout>
  );
}
