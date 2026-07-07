import type { LucideIcon } from 'lucide-react';

export function SitePageHero({
  label,
  title,
  description,
  icon: Icon,
  centered = true,
  children,
}: {
  label?: string;
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  centered?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className={`page-hero animate-fade-up ${centered ? 'page-hero-center' : ''}`}>
      {Icon && (
        <div className="page-hero-icon">
          <Icon className="h-8 w-8" />
        </div>
      )}
      {label && <span className="section-label">{label}</span>}
      <h1 className="section-heading mt-3 sm:mt-4">{title}</h1>
      {description && <p className="section-sub">{description}</p>}
      {children}
    </header>
  );
}
