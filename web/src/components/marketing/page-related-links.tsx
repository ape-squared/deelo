import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type RelatedLink = {
  href: string;
  label: string;
  external?: boolean;
};

const DEFAULT_LINKS: RelatedLink[] = [
  { href: '/docs', label: 'Documentation' },
  { href: '/support', label: 'Support' },
  { href: '/status', label: 'Status' },
  { href: '/changelog', label: 'Changelog' },
];

export function PageRelatedLinks({
  links = DEFAULT_LINKS,
  className = '',
}: {
  links?: RelatedLink[];
  className?: string;
}) {
  return (
    <nav className={`page-related-links ${className}`} aria-label="Related pages">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted">Explore</p>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map((link) =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="page-related-link"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </a>
          ) : (
            <Link key={link.href} href={link.href} className="page-related-link">
              {link.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
