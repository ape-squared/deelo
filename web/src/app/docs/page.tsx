import Link from 'next/link';
import type { Metadata } from 'next';
import { DOCS_NAV } from '@/lib/docs';
import { ArrowRight, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to set up Deelo in your server — security, configuration, integrations, and more.',
};

export default function DocsIndexPage() {
  return (
    <div className="docs-article-layout">
      <article className="docs-article">
        <p className="docs-eyebrow">Documentation</p>
        <h1 className="docs-title">Deelo Docs</h1>
        <p className="docs-description">
          Learn how to set up Deelo in your server or enhance everyday use with commands & more.
        </p>

        <div className="docs-callout docs-callout-info">
          <BookOpen className="h-4 w-4" />
          <p>
            Server prefix is set to <code className="docs-inline-code">,</code> by default. Use{' '}
            <code className="docs-inline-code">,prefix set &lt;symbol&gt;</code> to change it (Premium).
          </p>
        </div>

        <h2 id="guides" className="docs-prose-h2">
          <a href="#guides" className="docs-anchor">
            Guides
          </a>
        </h2>

        <div className="docs-home-sections">
          {DOCS_NAV.map((group) => (
            <section key={group.title} className="docs-home-section">
              <h3 className="docs-home-section-title">{group.title}</h3>
              <div className="docs-cards">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="docs-card">
                    <span className="docs-card-title">{item.title}</span>
                    <span className="docs-card-cta">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
