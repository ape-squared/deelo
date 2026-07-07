import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PLANS } from '@/lib/plans';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';

const ICONS = { free: Zap, premium: Sparkles, premium_plus: Crown } as const;

export default function PricingPage() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="mb-16 text-center animate-fade-up">
            <span className="section-label">Pricing</span>
            <h1 className="section-heading">
              Simple, <span className="gradient-text">transparent</span> pricing
            </h1>
            <p className="text-muted max-w-lg mx-auto">
              Start free, upgrade when you need more. Manage everything from your dashboard after inviting Deelo.
            </p>
          </div>

          <div className="grid gap-6 lg:gap-8 md:grid-cols-3">
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
                        <Check className="h-4 w-4 shrink-0 text-accent mt-0.5" />
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

          <div className="mt-16 card p-8 text-center animate-fade-up delay-300">
            <h3 className="text-lg font-semibold mb-2">Need help choosing?</h3>
            <p className="text-sm text-muted mb-4">
              Most servers start on Free. Premium unlocks anti-nuke, tickets, AI commands, and priority support.
            </p>
            <Link href="/commands" className="btn-ghost inline-flex">
              Browse all commands →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
