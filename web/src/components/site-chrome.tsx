import Link from 'next/link';
import { getInviteUrl } from '@/lib/invite';
import { getBannerAnnouncement, getDiscordSettings } from '@/lib/site-data';
import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';
import { DeeloLogoLink, DeeloWordmark, DeeloIcon } from '@/components/brand/logo';

const NAV = [
  { href: '/commands', label: 'Commands' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/announcements', label: 'News' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/status', label: 'Status' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-4 lg:px-6">
        <DeeloLogoLink />
        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3.5 py-2 text-muted transition hover:bg-white/5 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex text-sm">Dashboard</Link>
          <a href={getInviteUrl()} className="btn-primary text-sm py-2.5 px-5" target="_blank" rel="noreferrer">
            Add to Discord
          </a>
        </div>
      </div>
    </header>
  );
}

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
