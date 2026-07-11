import { Suspense } from 'react';
import { SiteFooter, SiteTopBanner } from '@/components/site-chrome';
import { SiteHeader } from '@/components/site-header';
import { getLatestAutoRelease } from '@/lib/releases';
import { WhatsNewModal } from '@/components/marketing/whats-new-modal';
import { SiteJsonLd } from '@/components/site-json-ld';
import { CookieConsent } from '@/components/cookie-consent';
import { MobileCtaBar } from '@/components/mobile-cta-bar';

export async function MarketingLayout({
  children,
  banner = true,
}: {
  children: React.ReactNode;
  banner?: boolean;
}) {
  const latestRelease = getLatestAutoRelease();

  return (
    <div className="site-v3 mesh-bg v3-mesh flex min-h-screen flex-col overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteJsonLd />
      {banner ? (
        <Suspense fallback={null}>
          <SiteTopBanner />
        </Suspense>
      ) : null}
      <SiteHeader />
      {children}
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
      <MobileCtaBar />
      <CookieConsent />
      <WhatsNewModal release={latestRelease} />
    </div>
  );
}

export function MarketingMain({
  children,
  className = '',
  narrow = false,
  medium = false,
  id = 'main-content',
}: {
  children: React.ReactNode;
  className?: string;
  /** max-w-3xl — changelog, announcements, legal */
  narrow?: boolean;
  /** max-w-4xl — status, commands, suggestions */
  medium?: boolean;
  id?: string;
}) {
  const width = narrow ? 'max-w-3xl' : medium ? 'max-w-4xl' : 'max-w-6xl';
  return (
    <main id={id} className={`site-main flex-1 ${className}`}>
      <div className={`mx-auto px-4 py-12 lg:px-6 lg:py-20 ${width}`}>
        {children}
      </div>
    </main>
  );
}
