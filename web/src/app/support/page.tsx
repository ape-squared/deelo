import Link from 'next/link';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { PageRelatedLinks } from '@/components/marketing/page-related-links';
import { getDiscordSettings } from '@/lib/site-data';
import { siteHost, brandDomain, isBrandDomainLive } from '@/lib/site-config';
import {
  Activity,
  BookOpen,
  Lightbulb,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export const metadata = {
  title: 'Support — Deelo',
  description: 'Get help with Deelo — Discord community, dashboard, status page, and feature requests.',
};

const SUPPORT_LINKS = [
  {
    href: '/docs',
    icon: BookOpen,
    title: 'Documentation',
    description: 'Setup guides for security, tickets, music, levels, and integrations.',
  },
  {
    href: 'discord',
    icon: MessageCircle,
    title: 'Discord community',
    description: 'Ask questions, report bugs, and meet other server owners.',
    external: true,
  },
  {
    href: '/dashboard',
    icon: Sparkles,
    title: 'Dashboard',
    description: 'Configure modules, plans, and redeem codes for your servers.',
  },
  {
    href: '/status',
    icon: Activity,
    title: 'System status',
    description: 'Check bot and website uptime before opening a ticket.',
  },
  {
    href: '/suggestions',
    icon: Lightbulb,
    title: 'Feature requests',
    description: 'Vote on ideas and suggest what we should build next.',
  },
] as const;

export default async function SupportPage() {
  const discord = await getDiscordSettings();
  const host = siteHost();

  return (
    <MarketingLayout>
      <MarketingSubHero
        icon={MessageCircle}
        label="Help"
        title="Support"
        description="We're a small team building in public. The fastest way to get help is our Discord community."
      />
      <MarketingMain narrow className="!pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          {SUPPORT_LINKS.map((item, i) => {
            const Icon = item.icon;
            const href = item.href === 'discord' ? discord.invite_url : item.href;
            const className =
              'support-link-card card card-glow group flex gap-4 p-6 animate-fade-up transition hover:border-accent/30';
            const style = { animationDelay: `${i * 60}ms` };

            if ('external' in item && item.external) {
              return (
                <a
                  key={item.href}
                  href={href}
                  className={className}
                  style={style}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="support-link-icon">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold transition group-hover:text-accent">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  </div>
                </a>
              );
            }

            return (
              <Link key={item.href} href={href} className={className} style={style}>
                <div className="support-link-icon">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-semibold transition group-hover:text-accent">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="card mt-8 p-6 text-sm text-muted animate-fade-up">
          <p>
            Website: <span className="font-mono text-foreground">{host}</span>
            {!isBrandDomainLive() && (
              <> · Custom domain <span className="font-mono text-foreground">{brandDomain()}</span> coming soon.</>
            )}
          </p>
          <p className="mt-2">
            For billing or premium access, open the dashboard and redeem a code, or ask in Discord support.
          </p>
        </div>

        <PageRelatedLinks
          className="mt-12"
          links={[
            { href: '/changelog', label: 'Changelog' },
            { href: '/announcements', label: 'Announcements' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/commands', label: 'Commands' },
          ]}
        />
      </MarketingMain>
    </MarketingLayout>
  );
}
