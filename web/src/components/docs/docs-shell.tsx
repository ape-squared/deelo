'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Search, X } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { DOCS_NAV, searchDocs } from '@/lib/docs';
import { inviteApiPath } from '@/lib/invite';

function NavLink({ href, title, onNavigate }: { href: string; title: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`docs-nav-link ${active ? 'docs-nav-link-active' : ''}`}
    >
      {title}
    </Link>
  );
}

function DocsSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="docs-sidebar-nav" aria-label="Documentation">
      {DOCS_NAV.map((group) => (
        <div key={group.title} className="docs-nav-group">
          <p className="docs-nav-group-title">{group.title}</p>
          <div className="docs-nav-group-links">
            {group.items.map((item) => (
              <NavLink key={item.href} href={item.href} title={item.title} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchDocs(query), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="docs-search-trigger" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
        <span>Search docs…</span>
        <kbd>⌘K</kbd>
      </button>
    );
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="docs-search-overlay" role="dialog" aria-modal="true" aria-label="Search documentation">
      <button type="button" className="docs-search-backdrop" aria-label="Close search" onClick={() => setOpen(false)} />
      <div className="docs-search-panel">
        <div className="docs-search-input-row">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation…"
            className="docs-search-input"
          />
          <button type="button" className="btn-ghost p-2" aria-label="Close" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="docs-search-results">
          {!query.trim() && <p className="docs-search-empty">Type to search guides and references.</p>}
          {query.trim() && !results.length && <p className="docs-search-empty">No results for “{query.trim()}”.</p>}
          {results.map((result) => (
            <Link
              key={result.href}
              href={result.href}
              className="docs-search-result"
              onClick={() => setOpen(false)}
            >
              <span className="docs-search-result-section">{result.section}</span>
              <span className="docs-search-result-title">{result.title}</span>
              <span className="docs-search-result-desc">{result.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MobileDocsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <div className="docs-mobile-overlay" role="dialog" aria-modal="true" aria-label="Docs menu">
      <button type="button" className="docs-mobile-backdrop" aria-label="Close menu" onClick={onClose} />
      <aside className="docs-mobile-panel">
        <div className="docs-mobile-panel-header">
          <span className="text-sm font-semibold">Documentation</span>
          <button type="button" className="btn-ghost p-2" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <DocsSidebarNav onNavigate={onClose} />
      </aside>
    </div>,
    document.body,
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="docs-shell">
      <header className="docs-topbar">
        <div className="docs-topbar-inner">
          <div className="docs-topbar-brand">
            <button
              type="button"
              className="docs-mobile-menu-btn"
              aria-label="Open docs menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/docs" className="docs-brand-link">
              <DeeloIcon size={28} />
              <DeeloWordmark height={20} />
              <span className="docs-brand-badge">Docs</span>
            </Link>
          </div>
          <div className="docs-topbar-actions">
            <DocsSearch />
            <Link href="/" className="docs-top-link hidden sm:inline-flex">
              Home
            </Link>
            <Link href="/commands" className="docs-top-link hidden md:inline-flex">
              Commands
            </Link>
            <a href={inviteApiPath()} className="btn-primary docs-invite-btn" target="_blank" rel="noreferrer">
              Add to Discord
            </a>
          </div>
        </div>
      </header>

      <div className="docs-body">
        <aside className="docs-sidebar">
          <DocsSidebarNav />
          <div className="docs-sidebar-footer">
            <Link href="/support">Support</Link>
            <Link href="/changelog">Changelog</Link>
          </div>
        </aside>
        <div className="docs-content-wrap">{children}</div>
      </div>

      <MobileDocsDrawer open={mobileOpen} onClose={closeMobile} />
    </div>
  );
}
