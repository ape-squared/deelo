import type { ReactNode } from 'react';

export function ComingSoonBanner({
  title = 'Coming soon',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <p className="font-medium text-amber-200/90">{title}</p>
      <p className="mt-1 text-muted">{children}</p>
    </div>
  );
}

export function StatusBadge({
  variant,
  children,
}: {
  variant: 'coming-soon' | 'partial' | 'supported' | 'not-implemented';
  children: ReactNode;
}) {
  const cls =
    variant === 'supported'
      ? 'badge badge-accent'
      : variant === 'partial'
        ? 'badge badge-warning'
        : 'badge border border-border text-muted';
  return <span className={`${cls} text-[10px]`}>{children}</span>;
}
