'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Label,
  Spinner,
  Switch,
  TextArea,
  TextField,
  cn,
} from '@heroui/react';

/* ── Layout ───────────────────────────────────────────────────────────── */

export function DashPanel({
  title,
  desc,
  children,
  className,
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border border-default/40 bg-surface p-6 lg:p-8', className)}>
      {title && (
        <Card.Header className="mb-2 p-0">
          <Card.Title className="text-lg font-semibold">{title}</Card.Title>
          {desc && <Card.Description className="text-sm text-muted">{desc}</Card.Description>}
        </Card.Header>
      )}
      <Card.Content className={cn('space-y-5 p-0', !title && 'pt-0')}>{children}</Card.Content>
    </Card>
  );
}

export const DashSection = DashPanel;

export function DashField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

/* ── Form controls ────────────────────────────────────────────────────── */

export function DashInput({
  className,
  isDisabled,
  disabled,
  ...props
}: ComponentProps<typeof Input> & { isDisabled?: boolean }) {
  return (
    <Input
      variant="primary"
      fullWidth
      className={cn('font-mono text-sm', className)}
      disabled={disabled ?? isDisabled}
      {...props}
    />
  );
}

export function DashTextarea({
  className,
  ...props
}: ComponentProps<typeof TextArea>) {
  return <TextArea variant="primary" fullWidth className={cn('min-h-[80px] text-sm', className)} {...props} />;
}

export function DashButton({
  variant = 'primary',
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'tertiary' }) {
  return (
    <Button variant={variant} className={cn('font-medium', className)} {...props}>
      {children}
    </Button>
  );
}

export function DashToggle({
  label,
  desc,
  checked,
  onChange,
  premium,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  premium?: boolean;
}) {
  return (
    <Card
      className={cn(
        'border p-4',
        premium ? 'border-warning/40 bg-warning/5' : 'border-default/40 bg-surface-secondary/50',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {label}
            {premium && (
              <Chip size="sm" color="warning" variant="soft" className="ml-2 align-middle">
                Premium
              </Chip>
            )}
          </p>
          {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
        </div>
        <Switch isSelected={checked} onChange={onChange} aria-label={label}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch>
      </div>
    </Card>
  );
}

/* ── Feedback ───────────────────────────────────────────────────────── */

export function DashAlert({
  children,
  status = 'accent',
  className,
}: {
  children: ReactNode;
  status?: 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  return (
    <Alert status={status} className={cn('animate-fade-in', className)}>
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function DashSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner size="lg" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

/* ── Headers & stats ────────────────────────────────────────────────── */

export function DashPageHeader({
  title,
  description,
  badge,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
        )}
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="max-w-2xl text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function DashStatCard({
  label,
  value,
  hint,
  trend,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const border =
    variant === 'success'
      ? 'border-success/30'
      : variant === 'warning'
        ? 'border-warning/30'
        : variant === 'danger'
          ? 'border-danger/30'
          : 'border-default/40';

  return (
    <Card className={cn('border bg-surface p-5', border)}>
      <div className="flex items-start justify-between gap-3">
        {icon && <div className="text-accent">{icon}</div>}
        {trend && <Chip size="sm" variant="soft">{trend}</Chip>}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function DashHubCard({
  href,
  title,
  description,
  icon,
}: {
  href?: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  const body = (
    <Card className="group h-full border border-default/40 bg-surface p-6 transition hover:border-accent/40 hover:bg-surface-secondary">
      {icon && <div className="text-accent">{icon}</div>}
      <Card.Title className="mt-4 text-lg">{title}</Card.Title>
      <Card.Description className="mt-1 leading-relaxed">{description}</Card.Description>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {body}
      </a>
    );
  }

  return body;
}

export function DashUserChip({
  username,
  avatar,
  subtitle,
}: {
  username: string;
  avatar?: string | null;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-default/40 bg-surface-secondary/60 py-1 pl-1 pr-3">
      <Avatar size="sm" className="h-7 w-7">
        {avatar ? <Avatar.Image src={avatar} alt="" /> : null}
        <Avatar.Fallback>{username[0]?.toUpperCase()}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0">
        <p className="max-w-[120px] truncate text-sm font-medium">{username}</p>
        {subtitle && <p className="text-[10px] capitalize text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── Login shell ────────────────────────────────────────────────────── */

export function DashLoginCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="w-full max-w-md border border-default/40 bg-surface p-8 shadow-xl">
      <Card.Header className="mb-6 p-0">
        <Card.Title className="text-xl">{title}</Card.Title>
        {subtitle && <Card.Description className="mt-1">{subtitle}</Card.Description>}
      </Card.Header>
      <Card.Content className="space-y-5 p-0">{children}</Card.Content>
      {footer && <Card.Footer className="mt-6 p-0">{footer}</Card.Footer>}
    </Card>
  );
}

export function DashLoginField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <TextField className="w-full">
      <Label>{label}</Label>
      {children}
    </TextField>
  );
}
