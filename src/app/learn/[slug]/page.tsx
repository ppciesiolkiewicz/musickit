import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { ARTICLES, articleOf } from "@/features/articles";
import ArticleView from "@/features/articles/ui/ArticleView";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => ARTICLES.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = articleOf((await params).slug);
  if (!a) return {};
  return { title: a.metaTitle, description: a.description, alternates: { canonical: `/learn/${a.slug}` } };
}

/** A public article at /learn/<slug> (`features/articles`). */
export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const a = articleOf((await params).slug);
  if (!a) notFound();
  return (
    <PageShell active="/learn" column devices={a.sings} mic={a.sings} title={a.title} intro={a.intro} decor={<GlassShapes />}>
      <ArticleView article={a} />
    </PageShell>
  );
}
