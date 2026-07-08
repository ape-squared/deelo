'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'deelo-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie notice">
      <p className="text-sm text-muted">
        We use essential cookies for sign-in and optional analytics to improve the site.{' '}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy policy
        </Link>
      </p>
      <button type="button" onClick={accept} className="btn-primary shrink-0 text-sm py-2">
        Got it
      </button>
    </div>
  );
}
