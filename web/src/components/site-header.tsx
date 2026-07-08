'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

function useMobileNav() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return mobile;
}

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

function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="site-mobile-nav-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
      <button type="button" className="site-mobile-nav-backdrop" aria-label="Close menu" onClick={onClose} />
      <div className="site-mobile-nav-panel">
        <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
          {NAV.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} onNavigate={onClose} />
          ))}
          <div className="v3-divider my-3" />
          <Link href="/dashboard" className="site-nav-link" onClick={onClose}>
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
    </div>,
    document.body,
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isMobileNav = useMobileNav();
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNav) setOpen(false);
  }, [isMobileNav]);

  return (
    <header className="site-header-v3">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-6">
        <div className="site-header-brand min-w-0">
          <DeeloLogoLink />
        </div>

        <nav className="hidden min-w-0 items-center gap-0.5 md:flex" aria-label="Main">
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
          {isMobileNav && (
            <button
              type="button"
              className="btn-ghost inline-flex p-2.5"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {isMobileNav && <MobileNavDrawer open={open} onClose={closeMenu} />}
    </header>
  );
}
