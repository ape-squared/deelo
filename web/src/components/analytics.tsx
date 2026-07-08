'use client';

import Script from 'next/script';
import { analyticsId } from '@/lib/site-config';

export function Analytics() {
  const id = analyticsId();
  if (!id) return null;

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
