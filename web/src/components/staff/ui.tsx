import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function StaffPageHeader({
  title,
  description,
  badge,
  action,
}: {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="staff-page-header">
      <div>
        {badge && (
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">{badge}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StaffHubCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="staff-hub-card group">
      <div className="staff-hub-card-icon">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="font-semibold text-lg mt-4">{title}</h2>
      <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export function StaffStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="staff-stat-card">
      <p className="staff-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="staff-stat-label">{label}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
