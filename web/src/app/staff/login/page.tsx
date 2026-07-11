'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { DashAlert, DashLoginCard } from '@/components/ui/dashboard-kit';

function StaffLoginContent() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="staff-app mesh-bg v3-mesh flex min-h-screen" data-theme="dark">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border p-12">
        <Link href="/" className="flex items-center gap-2 text-muted transition hover:text-foreground">
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
          <h1 className="mb-4 text-4xl font-bold">Staff portal</h1>
          <p className="max-w-md leading-relaxed text-muted">
            Role-based tools for support staff, bot moderators, and developers. Sign in with the Discord account granted platform access.
          </p>
        </div>
        <p className="text-xs text-muted">Authorized Deelo platform staff only</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8 text-center lg:hidden">
            <div className="brand-logo-mark mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={32} />
            </div>
            <DeeloWordmark height={22} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Staff portal</h1>
          </div>

          <DashLoginCard
            title="Sign in with Discord"
            subtitle="Your Discord account must be on the platform team. Contact a lead if you need access."
            footer={
              <p className="text-center text-xs text-muted">
                Email admin?{' '}
                <Link href="/admin/login" className="text-accent hover:underline">
                  Use the admin panel
                </Link>
              </p>
            }
          >
            {error === 'not_staff' && (
              <DashAlert status="danger">This Discord account is not authorized for staff access.</DashAlert>
            )}

            <a href="/api/auth/discord?return=/staff" className="btn-primary w-full text-center">
              Continue with Discord
            </a>
          </DashLoginCard>
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
