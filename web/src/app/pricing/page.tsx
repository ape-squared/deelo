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

export default function PricingPage() {
  return (
    <MarketingLayout banner={false}>
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
