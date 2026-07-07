import { NextResponse } from 'next/server';
import { getPublishedAnnouncements, getBannerAnnouncement } from '@/lib/site-data';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('banner') === '1') {
    const banner = await getBannerAnnouncement();
    return NextResponse.json({ announcement: banner });
  }
  const announcements = await getPublishedAnnouncements();
  return NextResponse.json({ announcements });
}
