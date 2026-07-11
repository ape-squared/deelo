'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { DeeloLogoLink } from '@/components/brand/logo';
import { inviteApiPath } from '@/lib/invite';

const PRIMARY_NAV = [
  { href: '/docs', label: 'Docs' },
  { href: '/commands', label: 'Commands' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: 'Changelog' },
] as const;

const MORE_NAV = [
  { href: '/suggestions', label: 'Suggestions' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/status', label: 'Status' },
  { href: '/support', label: 'Support' },
] as const;

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

function useMobileNav() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return mobile;
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  onNavigate,
  className = '',
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`site-nav-link ${active ? 'site-nav-link-active' : ''} ${className}`}
    >
      {label}
    </Link>
  );
}

function MoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreActive = MORE_NAV.some(({ href }) => isActive(pathname, href));

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`site-nav-link inline-flex items-center gap-1 ${moreActive ? 'site-nav-link-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        More
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="site-nav-more-menu" role="menu">
          {MORE_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className={`site-nav-more-item ${isActive(pathname, href) ? 'site-nav-more-item-active' : ''}`}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileNavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2">
      <p className="site-mobile-nav-label">{title}</p>
      <div className="mt-1 flex flex-col gap-0.5">{children}</div>
    </div>
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
        <nav className="flex flex-col py-3" aria-label="Mobile">
          <MobileNavSection title="Product">
            <NavLink href="/docs" label="Docs" onNavigate={onClose} />
            <NavLink href="/commands" label="Commands" onNavigate={onClose} />
            <NavLink href="/pricing" label="Pricing" onNavigate={onClose} />
          </MobileNavSection>
          <MobileNavSection title="Updates">
            <NavLink href="/changelog" label="Changelog" onNavigate={onClose} />
            <NavLink href="/announcements" label="Announcements" onNavigate={onClose} />
            <NavLink href="/status" label="Status" onNavigate={onClose} />
          </MobileNavSection>
          <MobileNavSection title="Community">
            <NavLink href="/suggestions" label="Suggestions" onNavigate={onClose} />
            <NavLink href="/support" label="Support" onNavigate={onClose} />
          </MobileNavSection>
          <div className="v3-divider mx-4 my-2" />
          <div className="flex flex-col gap-2 px-4 py-2">
            <Link href="/dashboard" className="site-nav-link" onClick={onClose}>
              Dashboard
            </Link>
            <a
              href={inviteApiPath()}
              className="btn-primary w-full text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Add to Discord
            </a>
          </div>
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
        <div className="site-header-brand min-w-0">
          <DeeloLogoLink />
        </div>

        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Main">
          {PRIMARY_NAV.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} />
          ))}
          <MoreMenu />
        </nav>

        <div className="site-header-actions">
          <Link href="/dashboard" className="btn-ghost hidden text-sm lg:inline-flex">
            Dashboard
          </Link>
          <a
            href={inviteApiPath()}
            className="btn-primary hidden py-2.5 px-4 text-sm lg:inline-flex lg:px-5"
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

// Keep export for tests or future use
export { ALL_NAV as SITE_NAV_LINKS };
