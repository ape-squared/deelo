import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Live system status for Deelo bot, Discord API, and dashboard services.',
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
