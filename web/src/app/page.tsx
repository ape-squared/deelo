import Link from 'next/link';
import { SiteFooter, SiteHeader, SiteTopBanner } from '@/components/site-chrome';
import { getInviteUrl } from '@/lib/invite';
import { getDiscordSettings, getHeroSettings, getLatestChangelog } from '@/lib/site-data';
import { FadeUp } from '@/components/ui/animate';
import { DiscordWidget } from '@/components/discord-widget';
import { DeeloIcon } from '@/components/brand/logo';
import { CHANGELOG_CATEGORY_LABELS } from '@/lib/site-content';
import {
  ArrowRight, Sparkles, ScrollText, Check,
} from 'lucide-react';
import {
  CommandPreview,
  CompareSection,
  DashboardPreviewSection,
  FaqSectionWrapper,
  FinalCta,
  HowItWorksSection,
  ModulesSection,
  PricingTeaser,
  TrustBar,
} from '@/components/marketing/home-sections';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [discord, hero, latestChangelog] = await Promise.all([
    getDiscordSettings(),
    getHeroSettings(),
    getLatestChangelog(),
  ]);

  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      <SiteTopBanner />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-14 lg:pb-28 lg:pt-20">
          <div className="grid-pattern pointer-events-none absolute inset-0" />
          <div className="brand-hero-glow right-0 top-0 h-[500px] w-[500px] translate-x-1/4 -translate-y-1/4" />
          <div className="brand-hero-glow left-0 bottom-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 opacity-60" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16 lg:px-6">
            <div>
              <FadeUp>
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent">
                    <Sparkles className="h-4 w-4" />
                    {hero.badge}
                  </span>
                </div>
              </FadeUp>
              <FadeUp delay={100}>
                <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  The Discord bot
                  <span className="gradient-text block mt-2">built for serious servers</span>
                </h1>
              </FadeUp>
              <FadeUp delay={200}>
                <p className="mt-6 max-w-lg text-lg text-muted leading-relaxed">
                  Moderation, music, levels, tickets, automod, and 1,144 commands — unified under one prefix,
                  one dashboard, and one brand you can trust.
                </p>
              </FadeUp>
              <FadeUp delay={300}>
                <ul className="mt-6 space-y-2.5 text-sm text-muted">
                  {['Anti-nuke & anti-raid protection', 'Professional web dashboard', 'Free tier with no time limit'].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeUp>
              <FadeUp delay={400}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <a href={getInviteUrl()} className="btn-primary text-base px-8" target="_blank" rel="noreferrer">
                    Add to Discord
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link href="/dashboard" className="btn-secondary text-base">Open dashboard</Link>
                </div>
              </FadeUp>

              {hero.show_latest_changelog && latestChangelog && (
                <FadeUp delay={450}>
                  <Link
                    href="/changelog"
                    className="mt-8 flex max-w-md items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm transition hover:border-accent/30 hover:bg-card/70"
                  >
                    <ScrollText className="h-5 w-5 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Latest update</p>
                      <p className="font-medium truncate">
                        {latestChangelog.version ? `v${latestChangelog.version} — ` : ''}
                        {latestChangelog.title}
                      </p>
                    </div>
                    <span className="badge badge-muted shrink-0 text-[10px]">
                      {CHANGELOG_CATEGORY_LABELS[latestChangelog.category]}
                    </span>
                  </Link>
                </FadeUp>
              )}
            </div>

            <FadeUp delay={200}>
              <div className="relative">
                <div className="absolute -left-6 -top-6 z-10 hidden lg:block">
                  <DeeloIcon size={56} className="shadow-2xl shadow-accent/40 animate-float" />
                </div>
                <CommandPreview />
              </div>
            </FadeUp>
          </div>
        </section>

        <TrustBar />
        <ModulesSection />
        <HowItWorksSection />
        <DashboardPreviewSection />
        <CompareSection />

        <section className="border-y border-border bg-white/[0.015] py-24 px-4">
          <div className="mx-auto max-w-6xl lg:px-6">
            <DiscordWidget settings={discord} />
          </div>
        </section>

        <PricingTeaser />
        <FaqSectionWrapper />
        <FinalCta discordInvite={discord.invite_url} />
      </main>
      <SiteFooter />
    </div>
  );
}
