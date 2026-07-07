import Link from 'next/link';
import {
  Shield, Zap, Music, Ticket, Bot, Layers, BarChart3, Check, X, ArrowRight,
  Settings, UserPlus, TrendingUp, Terminal, Hash, Mic, Star,
} from 'lucide-react';
import { FEATURE_SECTIONS, PLANS, STATS } from '@/lib/plans';
import { getInviteUrl } from '@/lib/invite';
import { FaqSection } from './faq';

const MODULE_ICONS = [Shield, Zap, Music, Ticket, Bot, Layers];

const STEPS = [
  {
    icon: UserPlus,
    title: 'Invite Deelo',
    desc: 'Add Deelo to your server with one click. No setup wizard required — you\'re live instantly.',
  },
  {
    icon: Settings,
    title: 'Configure modules',
    desc: 'Use the dashboard to set up moderation, welcome messages, tickets, levels, and more in minutes.',
  },
  {
    icon: TrendingUp,
    title: 'Grow your community',
    desc: 'Automate the busywork. Focus on your members while Deelo handles moderation, engagement, and utilities.',
  },
];

const COMPARE_ROWS = [
  { feature: 'Moderation & cases', deelo: true, others: true },
  { feature: 'Music & voice', deelo: true, others: false },
  { feature: 'Levels & XP', deelo: true, others: false },
  { feature: 'Tickets & starboard', deelo: true, others: false },
  { feature: 'Anti-nuke & anti-raid', deelo: true, others: false },
  { feature: 'Social feed integrations', deelo: true, others: false },
  { feature: '1,144 commands', deelo: true, others: false },
  { feature: 'Unified dashboard', deelo: true, others: false },
];

const DASH_MODULES = [
  { icon: Shield, label: 'Moderation', on: true },
  { icon: Hash, label: 'Welcome', on: true },
  { icon: Ticket, label: 'Tickets', on: false },
  { icon: Star, label: 'Starboard', on: true },
  { icon: Mic, label: 'Voicemaster', on: false },
  { icon: BarChart3, label: 'Levels', on: true },
];

export function HowItWorksSection() {
  return (
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="mb-16 text-center">
          <span className="section-label">How it works</span>
          <h2 className="section-heading">Up and running in minutes</h2>
          <p className="section-sub mx-auto">No complicated onboarding. Invite, configure, done.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="step-card animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="step-number">{i + 1}</div>
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ModulesSection() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-6xl lg:px-6">
      <div className="mb-16 text-center">
        <span className="section-label">Modules</span>
        <h2 className="section-heading">Every tool your server needs</h2>
        <p className="section-sub mx-auto">
          Six core systems. One bot. Fully configurable from the dashboard or with commands.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURE_SECTIONS.map((f, i) => {
          const Icon = MODULE_ICONS[i % MODULE_ICONS.length];
          return (
            <div key={f.title} className="feature-module animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed mb-5">{f.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span key={t} className="badge badge-muted text-[11px]">{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}

export function DashboardPreviewSection() {
  return (
    <section className="site-section site-section-alt relative overflow-hidden">
      <div className="brand-hero-glow -left-32 top-1/2 h-96 w-96 -translate-y-1/2" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:px-6">
        <div>
          <span className="section-label">Dashboard</span>
          <h2 className="section-heading">Control everything from one place</h2>
          <p className="section-sub">
            A professional web dashboard built for server owners. Toggle modules, edit welcome messages,
            manage automod filters, ticket panels, and premium settings — all synced live with your bot.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {['Real-time guild sync', 'Module-based navigation', 'Role & channel pickers', 'Plan management & redeem codes'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-muted">
                <span className="compare-check">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn-primary mt-8 text-sm">
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="dash-mockup animate-fade-up">
          <div className="dash-mockup-bar">
            <div className="flex gap-1.5">
              <span className="dash-mockup-dot bg-red-500/80" />
              <span className="dash-mockup-dot bg-amber-500/80" />
              <span className="dash-mockup-dot bg-green-500/80" />
            </div>
            <span className="text-xs text-muted font-mono">/dashboard</span>
          </div>
          <div className="flex min-h-[320px]">
            <div className="w-14 shrink-0 border-r border-border bg-white/[0.02] p-2 space-y-2">
              {DASH_MODULES.slice(0, 4).map((m) => (
                <div key={m.label} className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.on ? 'bg-accent/20 text-accent' : 'text-muted'}`}>
                  <m.icon className="h-4 w-4" />
                </div>
              ))}
            </div>
            <div className="w-44 shrink-0 border-r border-border bg-white/[0.015] p-3 hidden sm:block">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">Modules</p>
              {DASH_MODULES.map((m) => (
                <div
                  key={m.label}
                  className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${m.on ? 'bg-accent/15 text-accent font-medium' : 'text-muted'}`}
                >
                  <m.icon className="h-3.5 w-3.5" />
                  {m.label}
                </div>
              ))}
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm font-semibold mb-1">Server settings</p>
              <p className="text-xs text-muted mb-4">Manage your community modules</p>
              <div className="space-y-2">
                {DASH_MODULES.map((m) => (
                  <div key={m.label} className="flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                    <span className="text-xs">{m.label}</span>
                    <span className={`module-status ${m.on ? 'module-status-on' : 'module-status-off'}`}>
                      {m.on ? 'On' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompareSection() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-4xl lg:px-6">
      <div className="mb-12 text-center">
        <span className="section-label">Why Deelo</span>
        <h2 className="section-heading">One bot instead of five</h2>
        <p className="section-sub mx-auto">
          Stop stacking single-purpose bots. Deelo bundles everything with one prefix and one dashboard.
        </p>
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-3 border-b border-border bg-white/[0.02] px-6 py-4 text-sm font-semibold">
          <span className="text-muted">Feature</span>
          <span className="text-center text-accent">Deelo</span>
          <span className="text-center text-muted">Typical stack</span>
        </div>
        {COMPARE_ROWS.map((row) => (
          <div key={row.feature} className="grid grid-cols-3 items-center border-b border-border/50 px-6 py-3.5 text-sm last:border-0">
            <span>{row.feature}</span>
            <div className="flex justify-center">
              {row.deelo ? <span className="compare-check"><Check className="h-3 w-3" /></span> : <span className="compare-x"><X className="h-3 w-3" /></span>}
            </div>
            <div className="flex justify-center">
              {row.others ? <span className="compare-check"><Check className="h-3 w-3" /></span> : <span className="compare-x"><X className="h-3 w-3" /></span>}
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

export function CommandPreview() {
  return (
    <div className="command-preview">
      <div className="command-preview-header">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span>#general</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          deelo online
        </span>
      </div>
      <div className="space-y-3 p-5">
        <p><span className="command-line-user">riq</span> <span className="text-foreground/80">,ban @user spam</span></p>
        <p className="command-line-bot pl-4">→ 🔨 Banned user · Case #42 logged</p>
        <p><span className="command-line-user">riq</span> <span className="text-foreground/80">,play lofi beats</span></p>
        <p className="command-line-bot pl-4">→ 🎵 Now playing in General VC</p>
        <p><span className="command-line-user">riq</span> <span className="text-foreground/80">,rank</span></p>
        <p className="command-line-bot pl-4">→ Level 24 · 12,450 XP · #3 on leaderboard</p>
      </div>
    </div>
  );
}

export function TrustBar() {
  return (
    <div className="trust-bar">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 lg:px-6">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="stat-value text-2xl sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingTeaser() {
  return (
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="mb-14 text-center">
          <span className="section-label">Pricing</span>
          <h2 className="section-heading">Start free. Scale when you grow.</h2>
          <p className="section-sub mx-auto">Transparent plans with no hidden fees. Upgrade from the dashboard anytime.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS.free][]).map(([key, plan]) => (
            <div key={key} className={`card p-8 ${key === 'premium' ? 'gradient-border' : ''}`}>
              {key === 'premium' && <span className="badge badge-accent mb-4">Most popular</span>}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-3 text-4xl font-bold">
                {plan.price}
                <span className="text-base font-normal text-muted">{plan.period}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{plan.description}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted">
                {plan.highlights.slice(0, 4).map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/pricing" className="btn-secondary text-sm">
            View full pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FaqSectionWrapper() {
  return <FaqSection />;
}

export function FinalCta({ discordInvite }: { discordInvite: string }) {
  return (
    <section className="site-section px-4">
      <div className="relative mx-auto max-w-3xl">
        <div className="cta-panel animate-fade-up">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to run your server on Deelo?</h2>
          <p className="mx-auto mb-8 max-w-lg text-lg text-muted">Join thousands of communities. Free to start, powerful at scale.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={getInviteUrl()} className="btn-primary px-10 text-base" target="_blank" rel="noreferrer">
              Add to Discord
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={discordInvite} className="btn-secondary text-base" target="_blank" rel="noreferrer">
              Join community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
