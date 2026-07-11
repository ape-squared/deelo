import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@heroui/react';
import { DashHubCard, DashPageHeader, DashStatCard } from '@/components/ui/dashboard-kit';

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
  return <DashPageHeader eyebrow={badge} title={title} description={description} action={action} />;
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
    <Link href={href} className="block">
      <Card className="group h-full border border-default/40 bg-surface p-6 transition hover:border-accent/40 hover:bg-surface-secondary">
        <div className="text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </Card>
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
  return <DashStatCard label={label} value={value} hint={hint} />;
}
