import Link from 'next/link';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { getDiscordSettings } from '@/lib/site-data';
import { siteHost, brandDomain, isBrandDomainLive } from '@/lib/site-config';
import { Headphones, MessageCircle, ScrollText, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Support',
  description: 'Get help with Deelo — Discord community, dashboard, status page, and feature requests.',
};

export default async function SupportPage() {
  const discord = await getDiscordSettings();
  const host = siteHost();

  return (
    <MarketingLayout>
      <MarketingSubHero
        icon={Headphones}
        label="Help"
        title="Support"
        description="We're a small team building in public. The fastest way to get help is our Discord community."
      />
      <MarketingMain narrow className="!py-12 lg:!py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={discord.invite_url}
            className="card flex gap-4 p-6 transition hover:border-accent/30"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-8 w-8 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold">Discord community</h2>
              <p className="mt-1 text-sm text-muted">Ask questions, report bugs, and meet other server owners.</p>
            </div>
          </a>
          <Link href="/dashboard" className="card flex gap-4 p-6 transition hover:border-accent/30">
            <Sparkles className="h-8 w-8 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold">Dashboard</h2>
              <p className="mt-1 text-sm text-muted">Configure modules, plans, and redeem codes for your servers.</p>
            </div>
          </Link>
          <Link href="/status" className="card flex gap-4 p-6 transition hover:border-accent/30">
            <Headphones className="h-8 w-8 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold">System status</h2>
              <p className="mt-1 text-sm text-muted">Check bot and website uptime before opening a ticket.</p>
            </div>
          </Link>
          <Link href="/suggestions" className="card flex gap-4 p-6 transition hover:border-accent/30">
            <ScrollText className="h-8 w-8 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold">Feature requests</h2>
              <p className="mt-1 text-sm text-muted">Vote on ideas and suggest what we should build next.</p>
            </div>
          </Link>
        </div>

        <div className="card mt-8 p-6 text-sm text-muted">
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
      </MarketingMain>
    </MarketingLayout>
  );
}
