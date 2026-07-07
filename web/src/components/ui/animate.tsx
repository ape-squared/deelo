'use client';

import { type ReactNode } from 'react';

export function FadeUp({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function LoadingScreen({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
      <p className="text-sm text-muted animate-pulse">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card animate-scale-in flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
