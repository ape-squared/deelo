import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Deelo — Discord Bot',
    short_name: 'Deelo',
    description: 'All-in-one Discord bot for moderation, music, levels, tickets, and community management.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050508',
    theme_color: '#0047ff',
    icons: [
      { src: '/brand/logo-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    scope: siteUrl(),
  };
}
