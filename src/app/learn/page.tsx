import type { Metadata } from "next";
import { shareMeta } from "@/app/_og/share";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { ARTICLES } from "@/features/articles";
import LearnList from "@/features/articles/ui/LearnList";
import { JoinCard } from "@/features/articles/ui/ArticleView";

export const metadata: Metadata = {
  title: "Guitar Theory and Singing Lessons, Free and Interactive · attunr",
  description: "Free guitar theory and singing guides with exercises on the page: chords, scales, CAGED, pitch matching and vocal warm-ups. Sing and see your pitch live.",
  alternates: { canonical: "/learn" },
  ...shareMeta({ path: "/learn", title: "Guitar theory and singing guides", description: "Free guitar theory and singing guides with exercises on the page: chords, scales, CAGED, pitch matching and vocal warm-ups. Sing and see your pitch live." }),
};

/** The public articles (`features/articles`), one card each, with the topic filter over them (`LearnList`). */
export default function LearnIndex() {
  return (
    <PageShell active="/learn" column title="Learn" intro="Short guitar theory and singing guides with exercises you can do right on the page." decor={<GlassShapes />}>
      <LearnList articles={ARTICLES} />
      <JoinCard />
    </PageShell>
  );
}
