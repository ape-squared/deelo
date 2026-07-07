import Link from 'next/link';
import {
  Shield, Zap, Music, Ticket, Bot, Layers, BarChart3, Check, ArrowRight,
  Settings, UserPlus, TrendingUp, Terminal, Hash, Mic, Star,
} from 'lucide-react';
import { FEATURE_SECTIONS, TYPICAL_STACK_COST } from '@/lib/plans';
import { getInviteUrl } from '@/lib/invite';

const MODULE_ICONS = [Shield, Zap, Music, Ticket, Bot, Layers];

const STEPS = [
  {
    icon: UserPlus,
    title: 'Invite Deelo',
    desc: 'Add Deelo with one click. No setup wizard — you\'re live instantly with one prefix for everything.',
  },
  {
    icon: Settings,
    title: 'Configure from the dashboard',
    desc: 'Set up moderation, welcome messages, tickets, levels, and automod in minutes. One dashboard replaces five.',
  },
  {
    icon: TrendingUp,
    title: 'Drop the extra bots',
    desc: 'Run Deelo alongside your current stack, then remove MEE6, Dyno, and the rest when you\'re ready.',
  },
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
    <section className="site-section">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="mb-16 text-center">
          <span className="section-label">How it works</span>
          <h2 className="section-heading">Switch in an afternoon</h2>
          <p className="section-sub mx-auto">
            No risky cutover. Invite Deelo, configure once, then retire the bots you&apos;re paying for.
          </p>
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
    <section className="site-section site-section-alt">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="mb-16 text-center">
          <span className="section-label">Modules</span>
          <h2 className="section-heading">One bot. Every tool your server needs.</h2>
          <p className="section-sub mx-auto">
            Six core systems with 1,144 commands — moderation, music, levels, tickets, automod, and utilities under one prefix.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_SECTIONS.map((f, i) => {
            const Icon = MODULE_ICONS[i % MODULE_ICONS.length];
            return (
              <div key={f.title} className="feature-module animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
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
    <section className="site-section relative overflow-hidden">
      <div className="brand-hero-glow -left-32 top-1/2 h-96 w-96 -translate-y-1/2" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:px-6">
        <div>
          <span className="section-label">Dashboard</span>
          <h2 className="section-heading">One dashboard instead of five</h2>
          <p className="section-sub">
            Toggle modules, edit welcome messages, manage automod, ticket panels, and premium settings — all synced live with your bot.
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
        <p><span className="command-line-user">riq</span> <span className="text-foreground/80">,stream https://radio.example/live</span></p>
        <p className="command-line-bot pl-4">→ 📻 Now playing live radio in General VC</p>
        <p><span className="command-line-user">riq</span> <span className="text-foreground/80">,rank</span></p>
        <p className="command-line-bot pl-4">→ Level 24 · 12,450 XP · #3 on leaderboard</p>
      </div>
    </div>
  );
}

export function HomeFinalCta({ discordInvite }: { discordInvite: string }) {
  return (
    <section className="site-section px-4">
      <div className="relative mx-auto max-w-3xl">
        <div className="cta-panel animate-fade-up">
          <h2 className="mb-4 text-balance text-2xl font-bold sm:text-3xl lg:text-4xl">
            Ready to ditch the bot stack?
          </h2>
          <p className="mx-auto mb-2 max-w-lg text-base text-muted sm:text-lg">
            Join thousands of communities running Deelo as their only bot. Free forever — upgrade only when you need more.
          </p>
          <p className="mx-auto mb-8 text-sm font-medium text-green-400">
            Premium saves ~$22/mo vs a typical {TYPICAL_STACK_COST.bots.length}-bot setup
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <a href={getInviteUrl()} className="btn-primary w-full px-10 text-base sm:w-auto" target="_blank" rel="noreferrer">
              Add Deelo free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={discordInvite} className="btn-secondary w-full text-base sm:w-auto" target="_blank" rel="noreferrer">
              Join community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePricingLink() {
  return (
    <section className="site-section-alt px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left lg:px-6">
        <div>
          <p className="text-sm font-semibold">Compare plans & bot-stack savings</p>
          <p className="mt-1 text-sm text-muted">See how Deelo Premium stacks up against MEE6, Dyno, and the rest.</p>
        </div>
        <Link href="/pricing" className="btn-secondary shrink-0 text-sm">
          View pricing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
