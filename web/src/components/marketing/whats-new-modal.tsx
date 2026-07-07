'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import type { AutoRelease } from '@/lib/releases';
import { CHANGELOG_CATEGORY_LABELS } from '@/lib/site-content';

const STORAGE_KEY = 'deelo-whats-new-seen';

function releaseStorageKey(release: AutoRelease): string {
  const lead = release.items[0]?.hash ?? release.version;
  return `${release.id}:${lead}`;
}

export function WhatsNewModal({ release }: { release: AutoRelease | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!release?.version) return;
    const key = releaseStorageKey(release);
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== key) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [release]);

  function dismiss() {
    if (release?.version) {
      try {
        localStorage.setItem(STORAGE_KEY, releaseStorageKey(release));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!open || !release) return null;

  return (
    <div className="whats-new-overlay" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <button type="button" className="whats-new-backdrop" aria-label="Close" onClick={dismiss} />
      <div className="whats-new-panel animate-scale-in">
        <div className="whats-new-header">
          <div className="flex items-center gap-2">
            <span className="whats-new-badge">
              <Sparkles className="h-3.5 w-3.5" />
              What&apos;s New
            </span>
            <span className="text-xs font-mono text-muted">{release.version}</span>
          </div>
          <button type="button" onClick={dismiss} className="btn-ghost p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="whats-new-body">
          <h2 id="whats-new-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            {release.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {CHANGELOG_CATEGORY_LABELS[release.category]} ·{' '}
            {new Date(release.published_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          <ul className="mt-6 space-y-3">
            {release.items.slice(0, 8).map((item) => (
              <li key={item.hash ?? item.title} className="whats-new-item">
                <span className={`whats-new-dot whats-new-dot-${item.category}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <p className="text-[11px] text-muted mt-0.5">{CHANGELOG_CATEGORY_LABELS[item.category]}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="whats-new-footer">
          <Link href="/changelog" className="btn-secondary text-sm" onClick={dismiss}>
            View full changelog
          </Link>
          <button type="button" className="btn-primary text-sm" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
