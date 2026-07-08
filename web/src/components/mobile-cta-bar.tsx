'use client';

import Link from 'next/link';
import { inviteApiPath } from '@/lib/invite';

export function MobileCtaBar() {
  return (
    <div className="mobile-cta-bar md:hidden" aria-hidden={false}>
      <Link href="/dashboard" className="btn-secondary flex-1 text-sm py-2.5">
        Dashboard
      </Link>
      <a
        href={inviteApiPath(undefined, { utm_source: 'site', utm_medium: 'mobile_bar', utm_campaign: 'launch' })}
        className="btn-primary flex-1 text-sm py-2.5"
        target="_blank"
        rel="noreferrer"
      >
        Add to Discord
      </a>
    </div>
  );
}
