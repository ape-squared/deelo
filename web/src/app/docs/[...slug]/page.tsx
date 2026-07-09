import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { DocsArticle } from '@/components/docs/docs-article';
import { getAllDocsSlugs, getDocsPage } from '@/lib/docs';

type Params = { slug: string[] };

export function generateStaticParams(): Params[] {
  return getAllDocsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocsPage(slug);
  if (!page) return { title: 'Not found' };
  return {
    title: page.title,
    description: page.description,
  };
}

export default async function DocsSlugPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (slug.length === 1 && slug[0] === 'introduction') {
    redirect('/docs/overview/introduction');
  }

  const page = getDocsPage(slug);
  if (!page) notFound();

  return <DocsArticle page={page} />;
}
