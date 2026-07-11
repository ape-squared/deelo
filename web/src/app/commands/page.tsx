import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { CommandsView } from './commands-view';
import { Terminal } from 'lucide-react';

export const metadata = {
  title: 'Commands — Deelo',
  description: 'Browse 1,056+ Deelo bot commands across moderation, music, levels, tickets, and more. Default prefix: comma (,).',
};

export default function CommandsPage() {
  return (
    <MarketingLayout>
      <MarketingSubHero
        icon={Terminal}
        label="Command reference"
        title={
          <>
            <span className="gradient-text">1,056+</span> commands
          </>
        }
        description="Browse all categories. Default prefix is comma (,)."
      />
      <MarketingMain medium className="!pt-0 !pb-16 lg:!pb-24">
        <CommandsView />
      </MarketingMain>
    </MarketingLayout>
  );
}
