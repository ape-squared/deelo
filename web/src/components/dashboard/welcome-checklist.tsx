'use client';

import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { inviteApiPath } from '@/lib/invite';

const STEPS = [
  { id: 'invite', label: 'Invite Deelo to your server', href: inviteApiPath(undefined, { utm_source: 'onboarding', utm_medium: 'welcome' }), external: true },
  { id: 'prefix', label: 'Set your command prefix', hint: 'Dashboard → Server → Settings' },
  { id: 'welcome', label: 'Configure welcome & mod log channels', hint: 'Dashboard → Modules' },
  { id: 'community', label: 'Join our Discord for support & suggestions', href: '/support' },
] as const;

export function WelcomeChecklist({ hasBot, show }: { hasBot: boolean; show: boolean }) {
  if (!show) return null;

  return (
    <div className="card mb-8 border-accent/25 bg-accent/5 p-6">
      <h2 className="text-lg font-semibold">Getting started</h2>
      <p className="mt-1 text-sm text-muted">Complete these steps to get the most out of Deelo.</p>
      <ul className="mt-5 space-y-3">
        {STEPS.map((step) => {
          const done = step.id === 'invite' && hasBot;
          const Icon = done ? Check : Circle;
          const content = (
            <>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${done ? 'text-green-400' : 'text-muted'}`} />
              <div>
                <p className={`text-sm font-medium ${done ? 'text-muted line-through' : ''}`}>{step.label}</p>
                {'hint' in step && step.hint && !done && (
                  <p className="text-xs text-muted">{step.hint}</p>
                )}
              </div>
            </>
          );
          return (
            <li key={step.id} className="flex gap-3">
              {'href' in step && step.href ? (
                'external' in step && step.external ? (
                  <a href={step.href} className="flex gap-3 hover:text-accent" target="_blank" rel="noreferrer">
                    {content}
                  </a>
                ) : (
                  <Link href={step.href} className="flex gap-3 hover:text-accent">
                    {content}
                  </Link>
                )
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
