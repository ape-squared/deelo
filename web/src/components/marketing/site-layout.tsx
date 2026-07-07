import { SiteFooter, SiteTopBanner } from '@/components/site-chrome';
import { SiteHeader } from '@/components/site-header';
import { getLatestAutoRelease } from '@/lib/releases';
import { WhatsNewModal } from '@/components/marketing/whats-new-modal';

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
      {banner ? <SiteTopBanner /> : null}
      <SiteHeader />
      {children}
      <SiteFooter />
      <WhatsNewModal release={latestRelease} />
    </div>
  );
}

export function MarketingMain({
  children,
  className = '',
  narrow = false,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <main className={`site-main flex-1 ${className}`}>
      <div className={`mx-auto px-4 py-16 lg:px-6 lg:py-24 ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>
        {children}
      </div>
    </main>
  );
}
