import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

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
    <>
      <SiteHeader />
      <main className="mesh-bg min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-16 lg:py-20">
          <div className="mb-10 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Legal</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
          </div>

          <article className="legal-prose card p-8 sm:p-10 animate-fade-up delay-100">
            {children}
          </article>

          <p className="mt-8 text-center text-sm text-muted animate-fade-in">
            Questions? Contact us through our{' '}
            <Link href="/dashboard" className="text-accent hover:underline">support channels</Link>
            {' '}or Discord server.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
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
