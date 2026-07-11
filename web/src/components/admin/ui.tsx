import {
  Server, Users, CreditCard, Crown, LayoutDashboard, AlertTriangle, Clock, Ban, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { DashPageHeader, DashPanel, DashStatCard } from '@/components/ui/dashboard-kit';

const STAT_ICONS: Record<string, LucideIcon> = {
  server: Server,
  users: Users,
  'credit-card': CreditCard,
  crown: Crown,
  alert: AlertTriangle,
  clock: Clock,
  ban: Ban,
  chart: BarChart3,
};

export function AdminPageHeader({
  title,
  description,
  action,
  badge = 'Control panel',
}: {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return <DashPageHeader eyebrow={badge} title={title} description={description} action={action} />;
}

export function AdminStatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
}: {
  label: string;
  value: number | string;
  icon: keyof typeof STAT_ICONS;
  trend?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const Icon = STAT_ICONS[icon] ?? LayoutDashboard;
  const mappedVariant =
    variant === 'warning' ? 'warning' : variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : 'default';

  return (
    <DashStatCard
      label={label}
      value={value}
      trend={trend}
      variant={mappedVariant}
      icon={<Icon className="h-5 w-5" />}
    />
  );
}

export function AdminCard({
  title,
  desc,
  children,
  className = '',
}: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DashPanel title={title} desc={desc} className={className}>
      {children}
    </DashPanel>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="p-12 text-center text-sm text-muted">{message}</p>;
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border border-default/40 bg-surface">
      <div className="overflow-x-auto">
        <table className="admin-table w-full text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function formatRelative(date: string | null) {
  if (!date) return '—';
  const d = new Date(date);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days}d`;
}
