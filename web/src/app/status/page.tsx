import { MarketingLayout } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { StatusView } from './status-view';
import { Activity } from 'lucide-react';

export default function StatusPage() {
  return (
    <MarketingLayout banner={false}>
      <main className="flex-1">
        <MarketingSubHero
          icon={Activity}
          label="System health"
          title="Status"
          description="Real-time health for the Deelo bot, dashboard, and database."
        />
        <StatusView />
      </main>
    </MarketingLayout>
  );
}
