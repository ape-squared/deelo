'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { DeeloIcon } from '@/components/brand/logo';
import { RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="site-v3 mesh-bg v3-mesh flex min-h-screen flex-col items-center justify-center px-4">
      <div className="card max-w-md w-full p-10 text-center">
        <DeeloIcon size={48} className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">
          An unexpected error occurred. Try again or check our status page.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <button type="button" onClick={reset} className="btn-primary text-sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link href="/" className="btn-secondary text-sm">Home</Link>
          <Link href="/status" className="btn-secondary text-sm">System status</Link>
        </div>
      </div>
    </div>
  );
}
