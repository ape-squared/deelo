'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';

function StaffLoginContent() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="mesh-bg v3-mesh flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border">
        <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="brand-logo-mark flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={40} />
            </span>
            <DeeloWordmark height={28} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Staff portal</h1>
          <p className="text-muted leading-relaxed max-w-md">
            Role-based tools for support staff, bot moderators, and developers. Sign in with the Discord account granted platform access.
          </p>
        </div>
        <p className="text-xs text-muted">Authorized Deelo platform staff only</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden mb-8 text-center">
            <div className="mx-auto mb-4 brand-logo-mark flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={32} />
            </div>
            <DeeloWordmark height={22} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Staff portal</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-1">Sign in with Discord</h2>
            <p className="text-sm text-muted mb-8">
              Your Discord account must be on the platform team. Contact a lead if you need access.
            </p>

            {error === 'not_staff' && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                This Discord account is not authorized for staff access.
              </div>
            )}

            <a href="/api/auth/discord?return=/staff" className="btn-primary w-full text-center">
              Continue with Discord
            </a>

            <p className="mt-6 text-center text-xs text-muted">
              Email admin? <Link href="/admin/login" className="text-accent hover:underline">Use the admin panel</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>}>
      <StaffLoginContent />
    </Suspense>
  );
}
