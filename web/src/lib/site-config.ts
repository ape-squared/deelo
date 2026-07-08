import { publicAppHost, publicAppUrl } from '@/lib/app-url-display';

/** Public marketing site URL (from env — currently staging until deelo.bot is live). */
export function siteUrl(): string {
  return publicAppUrl();
}

export function siteHost(): string {
  return publicAppHost();
}

/** Brand domain shown in footer/legal when custom domain isn't live yet. */
export function brandDomain(): string {
  return process.env.NEXT_PUBLIC_BRAND_DOMAIN?.trim() || 'deelo.bot';
}

export function isBrandDomainLive(): boolean {
  const brand = brandDomain();
  return siteHost() === brand || siteHost().endsWith(`.${brand}`);
}

export function analyticsId(): string | undefined {
  return process.env.NEXT_PUBLIC_ANALYTICS_ID?.trim() || undefined;
}

export const PUBLIC_ROUTES = [
  '/',
  '/commands',
  '/pricing',
  '/changelog',
  '/announcements',
  '/suggestions',
  '/status',
  '/dashboard',
  '/support',
  '/terms',
  '/privacy',
] as const;
