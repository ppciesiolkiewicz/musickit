import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { ARTICLES } from "@/features/articles";
import LearnList from "@/features/articles/ui/LearnList";
import { JoinCard } from "@/features/articles/ui/ArticleView";

export const metadata: Metadata = {
  title: "Learn: singing and guitar practice guides · attunr",
  description: "Short singing and guitar guides with exercises you do right on the page. Sing into your mic and see your pitch live.",
  alternates: { canonical: "/learn" },
  openGraph: { type: "website", siteName: "attunr", url: "/learn", title: "Learn: singing and guitar practice guides", description: "Short singing and guitar guides with exercises you do right on the page. Sing into your mic and see your pitch live." },
  twitter: { card: "summary_large_image", title: "Learn: singing and guitar practice guides", description: "Short singing and guitar guides with exercises you do right on the page. Sing into your mic and see your pitch live." },
};

/** The public articles (`features/articles`), one card each, with the topic filter over them (`LearnList`). */
export default function LearnIndex() {
  return (
    <PageShell active="/learn" column title="Learn" intro="Short guides with exercises you can do right on the page." decor={<GlassShapes />}>
      <LearnList articles={ARTICLES} />
      <JoinCard />
    </PageShell>
  );
}
