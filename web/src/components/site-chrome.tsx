import Link from 'next/link';
import { getBannerAnnouncement, getDiscordSettings } from '@/lib/site-data';
import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';
import { DeeloWordmark, DeeloIcon } from '@/components/brand/logo';
import { brandDomain, isBrandDomainLive, siteHost } from '@/lib/site-config';

export { SiteHeader } from '@/components/site-header';

export async function SiteTopBanner() {
  const banner = await getBannerAnnouncement();
  if (!banner) return null;
  return <SiteAnnouncementBanner announcement={banner} />;
}

export async function SiteFooter() {
  const discord = await getDiscordSettings();

  return (
    <footer className="site-footer-v3">
      <div className="v3-divider" />
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-5 flex items-center gap-3">
              <DeeloIcon size={40} />
              <div>
                <DeeloWordmark height={26} />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted">Discord bot</p>
              </div>
            </div>
            <p className="max-w-sm text-sm text-muted leading-relaxed">
              The all-in-one Discord bot for moderation, music, levels, tickets, and community growth.
              One prefix, one dashboard, one tool for serious servers.
            </p>
            <a
              href={discord.invite_url}
              className="btn-secondary mt-6 inline-flex text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Join our Discord
            </a>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="site-footer-label">Product</p>
              <div className="site-footer-links">
                <Link href="/commands">Commands</Link>
                <Link href="/suggestions">Suggestions</Link>
                <Link href="/pricing">Pricing</Link>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/status">Status</Link>
              </div>
            </div>
            <div>
              <p className="site-footer-label">Updates</p>
              <div className="site-footer-links">
                <Link href="/changelog">Changelog</Link>
                <Link href="/announcements">Announcements</Link>
                <Link href="/support">Support</Link>
              </div>
            </div>
            <div>
              <p className="site-footer-label">Legal</p>
              <div className="site-footer-links">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted">
          <p>© {new Date().getFullYear()} Deelo. All rights reserved.</p>
          <p className="font-mono text-accent/80">
            {isBrandDomainLive() ? brandDomain() : siteHost()}
          </p>
        </div>
      </div>
    </footer>
  );
}
