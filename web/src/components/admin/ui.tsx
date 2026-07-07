import {
  Server, Users, CreditCard, Crown, LayoutDashboard, AlertTriangle, Clock, Ban, BarChart3,
  type LucideIcon,
} from 'lucide-react';

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

export function AdminPageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-page-header">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Control Panel</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminStatCard({ label, value, icon, trend, variant = 'default' }: {
  label: string;
  value: number | string;
  icon: keyof typeof STAT_ICONS;
  trend?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const Icon = STAT_ICONS[icon] ?? LayoutDashboard;
  const variantClass = variant === 'warning' ? 'admin-stat-warning'
    : variant === 'danger' ? 'admin-stat-danger'
    : variant === 'success' ? 'admin-stat-success'
    : '';

  return (
    <div className={`admin-stat-card ${variantClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="admin-stat-icon">
          <Icon className="h-5 w-5" />
        </div>
        {trend && <span className="admin-stat-trend">{trend}</span>}
      </div>
      <p className="admin-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="admin-stat-label">{label}</p>
    </div>
  );
}

export function AdminCard({ title, desc, children, className = '' }: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-card ${className}`}>
      {(title || desc) && (
        <div className="admin-card-header">
          {title && <h2 className="font-semibold">{title}</h2>}
          {desc && <p className="text-sm text-muted mt-0.5">{desc}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="p-12 text-center text-sm text-muted">{message}</p>;
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">{children}</table>
    </div>
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
