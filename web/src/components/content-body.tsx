import { renderSimpleMarkdown } from '@/lib/site-content';

export function ContentBody({ body, className = '' }: { body: string; className?: string }) {
  const html = renderSimpleMarkdown(body);
  return (
    <div
      className={`legal-prose content-body ${className}`}
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}
