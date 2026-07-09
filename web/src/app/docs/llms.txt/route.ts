import { DOCS_PAGES, getDocsHref } from '@/lib/docs';
import { siteUrl } from '@/lib/site-config';

export const dynamic = 'force-static';

export async function GET() {
  const base = siteUrl();
  const lines = [
    '# Deelo',
    '',
    '> Deelo is an all-in-one Discord bot for moderation, music, levels, tickets, and community management.',
    '',
    '## Docs',
    '',
    ...DOCS_PAGES.map(
      (page) => `- [${page.title}](${base}${getDocsHref(page)}): ${page.description}`,
    ),
    '',
    '## Site',
    '',
    `- [Home](${base}/)`,
    `- [Commands](${base}/commands)`,
    `- [Pricing](${base}/pricing)`,
    `- [Support](${base}/support)`,
    `- [Changelog](${base}/changelog)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
