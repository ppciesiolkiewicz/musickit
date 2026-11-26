import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { ARTICLES, articleOf } from "@/features/articles";
import { articleJsonLd } from "@/features/articles/jsonLd";
import ArticleView from "@/features/articles/ui/ArticleView";
import { SITE_URL } from "@/lib/site";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => ARTICLES.map((a) => ({ slug: a.slug }));

/**
 * The article's own title, description and address, in search and in a shared link. `openGraph` and `twitter` are set here
 * because a page that leaves them out takes the root layout's whole block, the home page's title with it. The picture is
 * `opengraph-image.tsx` beside this file.
 */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = articleOf((await params).slug);
  if (!a) return {};
  const url = `/learn/${a.slug}`;
  return {
    title: a.metaTitle,
    description: a.description,
    alternates: { canonical: url },
    openGraph: { type: "article", siteName: "attunr", locale: "en_US", url, title: a.title, description: a.description, modifiedTime: a.updated },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

/** A public article at /learn/<slug> (`features/articles`). */
export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const a = articleOf((await params).slug);
  if (!a) notFound();
  return (
    <PageShell active="/learn" column devices={a.sings} mic={a.sings} title={a.title} intro={a.intro} decor={<GlassShapes />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(a, SITE_URL)).replace(/</g, "\\u003c") }} />
      <ArticleView article={a} />
    </PageShell>
  );
}
