import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { SitePageHero } from '@/components/marketing/page-hero';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';

const ICONS = { free: Zap, premium: Sparkles, premium_plus: Crown } as const;

export default function PricingPage() {
  return (
    <MarketingLayout banner={false}>
      <MarketingMain>
        <SitePageHero
          label="Pricing"
          title={<>Simple, <span className="gradient-text">transparent</span> pricing</>}
          description="Start free, upgrade when you need more. Manage everything from your dashboard after inviting Deelo."
        />

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS.free][]).map(([key, plan], i) => {
            const Icon = ICONS[key];
            const featured = key === 'premium';

            return (
              <div
                key={key}
                className={`card relative flex flex-col p-8 animate-fade-up ${featured ? 'gradient-border ring-1 ring-accent/30 lg:scale-[1.03]' : ''}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-accent">
                    Most popular
                  </span>
                )}

                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{plan.description}</p>

                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`mt-8 w-full text-center ${key === 'free' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {key === 'free' ? 'Get started free' : 'Upgrade in dashboard'}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="cta-panel mt-16 animate-fade-up delay-300">
          <h3 className="mb-2 text-lg font-semibold">Need help choosing?</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted">
            Most servers start on Free. Premium unlocks anti-nuke, tickets, AI commands, and priority support.
          </p>
          <Link href="/commands" className="btn-secondary inline-flex text-sm">
            Browse all commands →
          </Link>
        </div>
      </MarketingMain>
    </MarketingLayout>
  );
}
