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
      {banner ? <SiteTopBanner /> : null}
      <SiteHeader />
      {children}
      <SiteFooter />
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
  id = 'main-content',
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  id?: string;
}) {
  return (
    <main id={id} className={`site-main flex-1 ${className}`}>
      <div className={`mx-auto px-4 py-16 lg:px-6 lg:py-24 ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>
        {children}
      </div>
    </main>
  );
}
