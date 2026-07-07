import Link from 'next/link';
import { MarketingLayout, MarketingMain } from '@/components/marketing/site-layout';
import { SitePageHero } from '@/components/marketing/page-hero';

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <MarketingLayout banner={false}>
      <MarketingMain narrow>
        <SitePageHero
          label="Legal"
          title={title}
          description={`Last updated: ${updated}`}
          centered={false}
        />

        <article className="legal-prose card animate-fade-up p-8 delay-100 sm:p-10">
          {children}
        </article>

        <p className="mt-8 animate-fade-in text-center text-sm text-muted">
          Questions? Contact us through our{' '}
          <Link href="/dashboard" className="text-accent hover:underline">support channels</Link>
          {' '}or Discord server.
        </p>
      </MarketingMain>
    </MarketingLayout>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
