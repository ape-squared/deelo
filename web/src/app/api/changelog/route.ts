import { NextResponse } from 'next/server';
import { getPublishedChangelog, getLatestChangelog } from '@/lib/site-data';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('latest') === '1') {
    const entry = await getLatestChangelog();
    return NextResponse.json({ entry });
  }
  const entries = await getPublishedChangelog();
  return NextResponse.json({ entries });
}
