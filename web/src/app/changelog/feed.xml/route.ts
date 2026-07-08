import { NextResponse } from 'next/server';
import { getPublishedChangelog } from '@/lib/site-data';
import { siteUrl } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const entries = await getPublishedChangelog(20);
  const base = siteUrl();

  const items = entries
    .map(
      (entry) => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${base}/changelog</link>
      <guid isPermaLink="false">${escapeXml(String(entry.id))}</guid>
      <pubDate>${new Date(entry.published_at ?? entry.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(entry.body.slice(0, 500))}</description>
    </item>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Deelo Changelog</title>
    <link>${base}/changelog</link>
    <description>Release notes and updates for Deelo.</description>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
