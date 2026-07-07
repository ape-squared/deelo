import Link from 'next/link';
import { getBannerAnnouncement, getDiscordSettings } from '@/lib/site-data';
import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';
import { DeeloWordmark, DeeloIcon } from '@/components/brand/logo';

export { SiteHeader } from '@/components/site-header';

export async function SiteTopBanner() {
  const banner = await getBannerAnnouncement();
  if (!banner) return null;
  return <SiteAnnouncementBanner announcement={banner} />;
}

export async function SiteFooter() {
  const discord = await getDiscordSettings();

  return (
    <footer className="mt-auto border-t border-border bg-[#040408]">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-5 flex items-center gap-3">
              <DeeloIcon size={40} />
              <DeeloWordmark height={26} />
            </div>
            <p className="max-w-sm text-sm text-muted leading-relaxed">
              The all-in-one Discord bot for moderation, music, levels, tickets, and community growth.
              Built for server owners who want one powerful tool — not a bot stack.
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
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground/70">Product</p>
              <div className="space-y-2.5 text-sm text-muted">
                <Link href="/commands" className="block hover:text-accent transition">Commands</Link>
                <Link href="/pricing" className="block hover:text-accent transition">Pricing</Link>
                <Link href="/dashboard" className="block hover:text-accent transition">Dashboard</Link>
                <Link href="/status" className="block hover:text-accent transition">Status</Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground/70">Updates</p>
              <div className="space-y-2.5 text-sm text-muted">
                <Link href="/changelog" className="block hover:text-accent transition">Changelog</Link>
                <Link href="/announcements" className="block hover:text-accent transition">Announcements</Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground/70">Legal</p>
              <div className="space-y-2.5 text-sm text-muted">
                <Link href="/terms" className="block hover:text-accent transition">Terms</Link>
                <Link href="/privacy" className="block hover:text-accent transition">Privacy</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted">
          <p>© {new Date().getFullYear()} Deelo. All rights reserved.</p>
          <p className="font-mono text-accent/80">deelo.bot</p>
        </div>
      </div>
    </footer>
  );
}
