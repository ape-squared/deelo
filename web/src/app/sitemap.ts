import type { MetadataRoute } from 'next';
import { getAllDocsSlugs } from '@/lib/docs';
import { siteUrl } from '@/lib/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const docsPages = getAllDocsSlugs().map((slug) => ({
    url: `${base}/docs/${slug.join('/')}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/commands`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/suggestions`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/announcements`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/status`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
    { url: `${base}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ...docsPages,
  ];
}
