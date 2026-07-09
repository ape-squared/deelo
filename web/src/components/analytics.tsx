'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { analyticsId } from '@/lib/site-config';

const STORAGE_KEY = 'deelo-cookie-consent';

export function Analytics() {
  const id = analyticsId();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'accepted') setAllowed(true);
    } catch {
      /* ignore */
    }

    function onConsent() {
      setAllowed(true);
    }
    window.addEventListener('deelo-cookie-accepted', onConsent);
    return () => window.removeEventListener('deelo-cookie-accepted', onConsent);
  }, [id]);

  if (!id || !allowed) return null;

  if (id.startsWith('G-') || id.startsWith('UA-')) {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}</Script>
      </>
    );
  }

  return (
    <Script
      defer
      data-domain={id}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
