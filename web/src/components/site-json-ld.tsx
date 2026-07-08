import { siteUrl } from '@/lib/site-config';

export function SiteJsonLd() {
  const url = siteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Deelo',
        url,
        logo: `${url}/brand/logo-icon-og.png`,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Deelo',
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Discord',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        url,
        description:
          'All-in-one Discord bot for moderation, music, levels, tickets, and community management.',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
