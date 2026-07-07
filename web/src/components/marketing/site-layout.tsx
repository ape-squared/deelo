import { SiteFooter, SiteTopBanner } from '@/components/site-chrome';
import { SiteHeader } from '@/components/site-header';

export async function MarketingLayout({
  children,
  banner = true,
}: {
  children: React.ReactNode;
  banner?: boolean;
}) {
  return (
    <div className="site-v3 mesh-bg v3-mesh flex min-h-screen flex-col">
      {banner ? <SiteTopBanner /> : null}
      <SiteHeader />
      {children}
      <SiteFooter />
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
