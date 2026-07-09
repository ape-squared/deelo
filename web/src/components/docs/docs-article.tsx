import Link from 'next/link';
import type { DocsBlock, DocsPage } from '@/lib/docs';
import { getAdjacentDocs, getDocsHref } from '@/lib/docs';
import { ArrowLeft, ArrowRight, Info, Lightbulb, TriangleAlert } from 'lucide-react';

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="docs-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function CalloutIcon({ variant }: { variant: 'info' | 'warn' | 'tip' }) {
  if (variant === 'warn') return <TriangleAlert className="h-4 w-4" />;
  if (variant === 'tip') return <Lightbulb className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function renderBlock(block: DocsBlock, index: number) {
  switch (block.type) {
    case 'p':
      return (
        <p key={index} className="docs-prose-p">
          {inlineCode(block.text)}
        </p>
      );
    case 'h2':
      return (
        <h2 key={index} id={block.id} className="docs-prose-h2">
          <a href={`#${block.id}`} className="docs-anchor">
            {block.text}
          </a>
        </h2>
      );
    case 'h3':
      return (
        <h3 key={index} id={block.id} className="docs-prose-h3">
          <a href={`#${block.id}`} className="docs-anchor">
            {block.text}
          </a>
        </h3>
      );
    case 'ul':
      return (
        <ul key={index} className="docs-prose-ul">
          {block.items.map((item, i) => (
            <li key={i}>{inlineCode(item)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={index} className="docs-prose-ol">
          {block.items.map((item, i) => (
            <li key={i}>{inlineCode(item)}</li>
          ))}
        </ol>
      );
    case 'callout': {
      const variant = block.variant ?? 'info';
      return (
        <div key={index} className={`docs-callout docs-callout-${variant}`}>
          <CalloutIcon variant={variant} />
          <p>{inlineCode(block.text)}</p>
        </div>
      );
    }
    case 'code':
      return (
        <pre key={index} className="docs-code">
          <code>{block.code}</code>
        </pre>
      );
    case 'steps':
      return (
        <ol key={index} className="docs-steps">
          {block.items.map((step, i) => (
            <li key={i} className="docs-step">
              <span className="docs-step-num">{i + 1}</span>
              <div>
                <p className="docs-step-title">{step.title}</p>
                <p className="docs-step-body">{inlineCode(step.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'cards':
      return (
        <div key={index} className="docs-cards">
          {block.items.map((card) => (
            <Link key={card.href} href={card.href} className="docs-card">
              <span className="docs-card-title">{card.title}</span>
              <span className="docs-card-desc">{card.description}</span>
            </Link>
          ))}
        </div>
      );
    case 'table':
      return (
        <div key={index} className="docs-table-wrap">
          <table className="docs-table">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{inlineCode(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function Toc({ page }: { page: DocsPage }) {
  const headings = page.blocks.filter((b): b is Extract<DocsBlock, { type: 'h2' }> => b.type === 'h2');
  if (!headings.length) return null;

  return (
    <aside className="docs-toc" aria-label="On this page">
      <p className="docs-toc-title">On this page</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function DocsArticle({ page }: { page: DocsPage }) {
  const { prev, next } = getAdjacentDocs(page.slug);

  return (
    <div className="docs-article-layout">
      <article className="docs-article">
        <div className="docs-breadcrumb">
          <Link href="/docs">Docs</Link>
          <span>/</span>
          <span>{page.section}</span>
          <span>/</span>
          <span className="docs-breadcrumb-current">{page.title}</span>
        </div>
        <p className="docs-eyebrow">{page.section}</p>
        <h1 className="docs-title">{page.title}</h1>
        <p className="docs-description">{page.description}</p>
        <div className="docs-prose">{page.blocks.map(renderBlock)}</div>

        <nav className="docs-pager" aria-label="Adjacent pages">
          {prev ? (
            <Link href={getDocsHref(prev)} className="docs-pager-link">
              <ArrowLeft className="h-4 w-4" />
              <span>
                <span className="docs-pager-label">Previous</span>
                <span className="docs-pager-title">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={getDocsHref(next)} className="docs-pager-link docs-pager-next">
              <span>
                <span className="docs-pager-label">Next</span>
                <span className="docs-pager-title">{next.title}</span>
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </nav>
      </article>
      <Toc page={page} />
    </div>
  );
}
