'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { DeeloLogoLink } from '@/components/brand/logo';
import { inviteApiPath } from '@/lib/invite';

const NAV = [
  { href: '/commands', label: 'Commands' },
  { href: '/suggestions', label: 'Suggestions' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/status', label: 'Status' },
];

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`site-nav-link ${active ? 'site-nav-link-active' : ''}`}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="site-header-v3">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-6">
        <div className="site-header-brand min-w-0">
          <DeeloLogoLink />
        </div>

        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} />
          ))}
        </nav>

        <div className="site-header-actions">
          <Link href="/dashboard" className="btn-ghost hidden text-sm md:inline-flex">
            Dashboard
          </Link>
          <a
            href={inviteApiPath()}
            className="btn-primary hidden py-2.5 px-4 text-sm md:inline-flex lg:px-5"
            target="_blank"
            rel="noreferrer"
          >
            Add to Discord
          </a>
          <button
            type="button"
            className="btn-ghost inline-flex p-2.5 lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="site-mobile-nav lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {NAV.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} onNavigate={() => setOpen(false)} />
            ))}
            <div className="v3-divider my-3" />
            <Link href="/dashboard" className="site-nav-link" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <a
              href={inviteApiPath()}
              className="btn-primary mt-2 w-full text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Add to Discord
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
