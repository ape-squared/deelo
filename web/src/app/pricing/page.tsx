import type { Metadata } from 'next';
import { MarketingLayout } from '@/components/marketing/site-layout';
import {
  BotStackComparison,
  FeatureMatrixSection,
  MigrationSection,
  PricingFinalCta,
  PricingFaqSection,
  PricingHero,
  PricingPlanCards,
  PricingStatsBar,
  SwitchBenefitsSection,
} from '@/components/marketing/pricing-sections';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Deelo is free forever. Premium plans from $5/mo — redeem codes in the dashboard. Compare vs running MEE6, Dyno, Carl-bot, and more.',
};

export default function PricingPage() {
  return (
    <MarketingLayout>
      <main className="flex-1">
        <PricingHero />
        <PricingStatsBar />
        <PricingPlanCards />
        <BotStackComparison />
        <FeatureMatrixSection />
        <SwitchBenefitsSection />
        <MigrationSection />
        <PricingFaqSection />
        <PricingFinalCta />
      </main>
    </MarketingLayout>
  );
}
