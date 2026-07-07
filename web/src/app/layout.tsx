import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Deelo — All-in-One Discord Bot',
    template: '%s | Deelo',
  },
  description: 'Deelo is the all-in-one Discord bot for moderation, music, levels, tickets, and community management. 1,144 commands. One dashboard.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons: {
    icon: '/brand/logo-icon.png',
    apple: '/brand/logo-icon.png',
  },
  openGraph: {
    title: 'Deelo — All-in-One Discord Bot',
    description: 'Moderation, music, levels, tickets & more. Built for serious Discord communities.',
    images: ['/brand/logo-icon-og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
