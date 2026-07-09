import type { LucideIcon } from 'lucide-react';
import { FadeUp } from '@/components/ui/animate';

type HeroProps = {
  label?: string;
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  centered?: boolean;
  children?: React.ReactNode;
};

/** Compact full-bleed hero for marketing subpages — matches /pricing visual language */
export function MarketingSubHero({ label, title, description, icon: Icon, children }: HeroProps) {
  return (
    <section className="site-hero site-hero-sub">
      <div className="grid-pattern pointer-events-none absolute inset-0" />
      <div className="brand-hero-glow right-0 top-0 h-72 w-72 translate-x-1/4 -translate-y-1/4 opacity-80" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center lg:px-6">
        {Icon && (
          <FadeUp>
            <div className="page-hero-icon mx-auto mb-6">
              <Icon className="h-8 w-8" />
            </div>
          </FadeUp>
        )}
        {label && (
          <FadeUp delay={60}>
            <span className="section-label">{label}</span>
          </FadeUp>
        )}
        <FadeUp delay={120}>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{title}</h1>
        </FadeUp>
        {description && (
          <FadeUp delay={180}>
            <p className="section-sub mx-auto mt-4 max-w-2xl text-base sm:text-lg">{description}</p>
          </FadeUp>
        )}
        {children ? <FadeUp delay={240}>{children}</FadeUp> : null}
      </div>
    </section>
  );
}

/** Inline hero for content pages nested inside MarketingMain */
export function SitePageHero({
  label,
  title,
  description,
  icon: Icon,
  centered = true,
  children,
}: HeroProps) {
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
