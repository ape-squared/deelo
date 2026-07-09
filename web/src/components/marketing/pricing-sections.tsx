import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  Sparkles,
  X,
  Zap,
  PiggyBank,
  LayoutDashboard,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import {
  BOT_STACK_COLUMNS,
  BOT_STACK_ROWS,
  FEATURE_MATRIX,
  MIGRATION_STEPS,
  PLANS,
  PRICING_FAQ,
  PRICING_STATS,
  SWITCH_BENEFITS,
  TYPICAL_STACK_COST,
} from '@/lib/plans';
import { inviteApiPath } from '@/lib/invite';
import { dashboardRedeemPath } from '@/lib/dashboard-paths';
import type { FeatureMatrixValue } from '@/lib/plans';
import { FadeUp, Reveal } from '@/components/ui/animate';

const PLAN_ICONS = { free: Zap, premium: Sparkles, premium_plus: Crown } as const;

function CellValue({ value, highlight = false }: { value: boolean | 'partial'; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={`compare-check ${highlight ? 'compare-check-highlight' : ''}`}>
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (value === 'partial') {
    return <span className="pricing-partial">Partial</span>;
  }
  return (
    <span className="compare-x">
      <X className="h-3 w-3" />
    </span>
  );
}

function MatrixCell({ value }: { value: FeatureMatrixValue }) {
  if (value === true) {
    return (
      <span className="compare-check">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="compare-x">
        <X className="h-3 w-3" />
      </span>
    );
  }
  return <span className="text-xs font-medium text-foreground/90">{value}</span>;
}

export function PricingHero() {
  return (
    <section className="site-hero">
      <div className="grid-pattern pointer-events-none absolute inset-0" />
      <div className="brand-hero-glow right-0 top-0 h-[420px] w-[420px] translate-x-1/4 -translate-y-1/4" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center lg:px-6">
        <FadeUp>
          <span className="section-label">Pricing</span>
        </FadeUp>
        <FadeUp delay={80}>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Replace your bot stack
            <span className="gradient-text mt-2 block">for a fraction of the cost</span>
          </h1>
        </FadeUp>
        <FadeUp delay={160}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Most servers run MEE6, Dyno, a ticket bot, and a music bot — paying {TYPICAL_STACK_COST.label} across
            multiple dashboards. Deelo Premium gives you everything for $5/mo with one prefix and one dashboard.
          </p>
        </FadeUp>
        <FadeUp delay={240}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={inviteApiPath()} className="btn-primary px-8 text-base" target="_blank" rel="noreferrer">
              Switch to Deelo — free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href={dashboardRedeemPath()} className="btn-secondary text-base">
              Redeem a code
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

export function PricingStatsBar() {
  return (
    <Reveal as="div" className="pricing-stats-bar">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 lg:px-6">
        {PRICING_STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className={`stat-value text-2xl sm:text-3xl ${stat.label === 'You save' ? 'text-green-400' : ''}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function PricingPlanCards() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-6xl lg:px-6">
        <Reveal className="mb-14 text-center">
          <span className="section-label">Plans</span>
          <h2 className="section-heading">Start free. Upgrade when you outgrow it.</h2>
          <p className="section-sub mx-auto">
            Transparent pricing, no hidden fees. Premium plans are activated via redeem codes in the dashboard — self-serve checkout coming soon.
          </p>
        </Reveal>

        <div className="pricing-grid">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS.free][]).map(([key, plan], i) => {
            const Icon = PLAN_ICONS[key];
            const featured = key === 'premium';

            return (
              <Reveal
                key={key}
                delay={i * 100}
                className={`card relative flex flex-col p-8 ${featured ? 'pricing-card-featured gradient-border' : ''}`}
              >
                {featured && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 badge badge-accent">
                    Best value vs bot stack
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

                {featured && (
                  <p className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400">
                    Saves ~$22/mo vs a typical {TYPICAL_STACK_COST.bots.length}-bot stack
                  </p>
                )}

                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                {key === 'free' ? (
                  <a
                    href={inviteApiPath()}
                    className="btn-secondary mt-8 w-full text-center"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Add to Discord — free
                  </a>
                ) : (
                  <Link
                    href={dashboardRedeemPath()}
                    className="btn-primary mt-8 w-full text-center"
                  >
                    Redeem code in dashboard
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function BotStackComparison() {
  return (
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-6xl lg:px-6">
        <Reveal className="mb-12 text-center">
          <span className="section-label">Compare</span>
          <h2 className="section-heading">Deelo vs. the bots you&apos;re already paying for</h2>
          <p className="section-sub mx-auto">
            A typical server stacks {TYPICAL_STACK_COST.bots.join(', ')} — each with its own prefix, dashboard, and
            monthly fee. Deelo replaces the stack.
          </p>
        </Reveal>

        <Reveal delay={100} className="card pricing-compare-scroll overflow-x-auto">
          <table className="pricing-compare-table w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="px-4 py-4 text-left font-semibold text-muted">Feature</th>
                {BOT_STACK_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-4 text-center font-semibold ${col.highlight ? 'text-accent' : 'text-muted'}`}
                  >
                    <div>{col.label}</div>
                    <div className={`mt-1 text-xs font-normal ${col.highlight ? 'text-accent/80' : 'text-muted'}`}>
                      {col.price}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOT_STACK_ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3.5 font-medium">{row.feature}</td>
                  {BOT_STACK_COLUMNS.map((col) => {
                    const value = row[col.key as keyof typeof row];
                    if (typeof value === 'string') return null;
                    return (
                      <td key={col.key} className="px-3 py-3.5">
                        <div className="flex justify-center">
                          <CellValue value={value as boolean | 'partial'} highlight={col.highlight} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-white/[0.02] font-semibold">
                <td className="px-4 py-4">Monthly cost (typical)</td>
                {BOT_STACK_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-4 text-center ${col.highlight ? 'text-accent text-base' : 'text-muted'}`}
                  >
                    {col.price}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Reveal>

        <p className="mt-4 text-center text-xs text-muted">
          Competitor pricing is approximate and varies by plan. Deelo Premium is one subscription for the full stack.
        </p>
      </div>
    </section>
  );
}

export function FeatureMatrixSection() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-4xl lg:px-6">
        <div className="mb-12 text-center">
          <span className="section-label">Feature breakdown</span>
          <h2 className="section-heading">What each plan includes</h2>
          <p className="section-sub mx-auto">Every tier gets the full command catalog. Premium unlocks security, integrations, and limits.</p>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-4 border-b border-border bg-white/[0.02] px-4 py-4 text-sm font-semibold sm:px-6">
            <span className="text-muted">Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-accent">Premium</span>
            <span className="text-center text-amber-400">Premium+</span>
          </div>
          {FEATURE_MATRIX.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-4 items-center border-b border-border/50 px-4 py-3.5 text-sm last:border-0 sm:px-6"
            >
              <span className="pr-2 text-xs sm:text-sm">{row.feature}</span>
              <div className="flex justify-center">
                <MatrixCell value={row.free} />
              </div>
              <div className="flex justify-center">
                <MatrixCell value={row.premium} />
              </div>
              <div className="flex justify-center">
                <MatrixCell value={row.premium_plus} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SWITCH_ICONS = [PiggyBank, LayoutDashboard, Terminal, ShieldCheck];

export function SwitchBenefitsSection() {
  return (
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-6xl lg:px-6">
        <Reveal className="mb-14 text-center">
          <span className="section-label">Why switch</span>
          <h2 className="section-heading">Stop paying for five bots</h2>
          <p className="section-sub mx-auto">
            Server owners switch to Deelo to simplify management, cut costs, and give members a better experience.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {SWITCH_BENEFITS.map((benefit, i) => {
            const Icon = SWITCH_ICONS[i % SWITCH_ICONS.length];
            return (
              <Reveal key={benefit.title} delay={i * 80} className="feature-module">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{benefit.description}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MigrationSection() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-4xl lg:px-6">
        <Reveal className="mb-12 text-center">
          <span className="section-label">Migration</span>
          <h2 className="section-heading">Switch in an afternoon</h2>
          <p className="section-sub mx-auto">No risky cutover. Run Deelo alongside your current bots until you&apos;re ready.</p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {MIGRATION_STEPS.map((step, i) => (
            <Reveal key={step.step} delay={i * 100} className="step-card">
              <div className="step-number">{step.step}</div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingFaqSection() {
  return (
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-3xl lg:px-6">
        <Reveal className="mb-12 text-center">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading">Pricing questions</h2>
          <p className="section-sub mx-auto">Common questions from servers switching off a multi-bot setup.</p>
        </Reveal>
        <div className="space-y-3">
          {PRICING_FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 50} y={16}>
              <details className="faq-item group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingFinalCta() {
  return (
    <section className="site-section px-4">
      <div className="relative mx-auto max-w-3xl">
        <Reveal className="cta-panel">
          <h2 className="mb-4 text-balance text-2xl font-bold sm:text-3xl">
            Ready to ditch the bot stack?
          </h2>
          <p className="mx-auto mb-2 max-w-lg text-base text-muted">
            Start running Deelo as your only bot. Free forever — upgrade with a redeem code when you need more.
          </p>
          <p className="mx-auto mb-8 text-sm font-medium text-green-400">
            Premium saves ~$22/mo vs a typical {TYPICAL_STACK_COST.bots.length}-bot setup
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <a href={inviteApiPath()} className="btn-primary w-full px-10 text-base sm:w-auto" target="_blank" rel="noreferrer">
              Add Deelo free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/commands" className="btn-secondary w-full text-base sm:w-auto">
              Browse 1,144 commands
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
