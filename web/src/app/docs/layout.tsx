import type { Metadata } from 'next';
import { DocsShell } from '@/components/docs/docs-shell';

export const metadata: Metadata = {
  title: {
    default: 'Documentation',
    template: '%s | Deelo Docs',
  },
  description: 'Set up Deelo — moderation, security, tickets, music, levels, integrations, and more.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
