import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site-config';

export const dynamic = 'force-static';

/** Bleed-style root index — points crawlers at /docs/llms.txt */
export function GET() {
  return NextResponse.redirect(`${siteUrl()}/docs/llms.txt`, 308);
}
