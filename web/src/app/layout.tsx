import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { publicAppUrl } from '@/lib/app-url-display';
import { Analytics } from '@/components/analytics';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const base = publicAppUrl();
  const description =
    'Deelo is the all-in-one Discord bot for moderation, music, levels, tickets, and community management. 1,056 commands. One dashboard.';

  return {
    title: {
      default: 'Deelo — All-in-One Discord Bot',
      template: '%s | Deelo',
    },
    description,
    metadataBase: new URL(base),
    icons: {
      icon: '/brand/logo-icon.png',
      apple: '/brand/logo-icon.png',
    },
    openGraph: {
      type: 'website',
      siteName: 'Deelo',
      url: base,
      title: 'Deelo — All-in-One Discord Bot',
      description: 'Moderation, music, levels, tickets & more. Built for serious Discord communities.',
      images: [{ url: '/brand/logo-icon-og.png', width: 512, height: 512, alt: 'Deelo' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Deelo — All-in-One Discord Bot',
      description: 'Moderation, music, levels, tickets & more. One prefix, one dashboard.',
      images: ['/brand/logo-icon-og.png'],
    },
    alternates: {
      types: {
        'application/rss+xml': `${base}/changelog/feed.xml`,
      },
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
