import Link from 'next/link';
import { getInviteUrl } from '@/lib/invite';
import { DeeloLogoLink } from '@/components/brand/logo';

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
