import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { StatusView } from './status-view';
import { Activity } from 'lucide-react';

export const metadata = {
  title: 'Status — Deelo',
  description: 'Live system status for Deelo bot, Discord API, dashboard, and database.',
};

export default function StatusPage() {
  return (
    <MarketingLayout>
      <MarketingSubHero
        icon={Activity}
        label="System health"
        title="Status"
        description="Real-time health for the Deelo bot, dashboard, and database."
      />
      <MarketingMain medium className="!pt-0 !pb-16 lg:!pb-24">
        <StatusView />
      </MarketingMain>
    </MarketingLayout>
  );
}
