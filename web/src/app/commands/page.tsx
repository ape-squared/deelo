import { MarketingLayout } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { CommandsView } from './commands-view';
import { Terminal } from 'lucide-react';

export const metadata = {
  title: 'Commands',
  description: 'Browse 1,056+ Deelo bot commands across moderation, music, levels, tickets, and more. Default prefix: comma (,).',
};

export default function CommandsPage() {
  return (
    <MarketingLayout>
      <main className="flex-1">
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
        <CommandsView />
      </main>
    </MarketingLayout>
  );
}
