import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/site-layout';
import { DeeloIcon } from '@/components/brand/logo';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <MarketingLayout>
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="card max-w-md w-full p-10 text-center">
          <DeeloIcon size={48} className="mx-auto mb-6" />
          <p className="text-sm font-mono text-accent">404</p>
          <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
          <p className="mt-3 text-sm text-muted">
            That link may be outdated or mistyped. Try one of these instead:
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Link href="/" className="btn-primary text-sm">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="/commands" className="btn-secondary text-sm">Commands</Link>
            <Link href="/status" className="btn-secondary text-sm">Status</Link>
            <Link href="/support" className="btn-secondary text-sm">Support</Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
