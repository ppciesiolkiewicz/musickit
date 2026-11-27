import type { Metadata } from "next";
import { shareMeta } from "@/app/_og/share";
import { BookArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import type { Topic } from "@/features/articles/model";
import { TOPIC_PAGES, articlesOf } from "@/features/articles/topics";
import { topicJsonLd } from "@/features/articles/jsonLd";
import LearnList from "@/features/articles/ui/LearnList";
import { JoinCard } from "@/features/articles/ui/ArticleView";
import { SITE_URL } from "@/lib/site";

/*
 * A topic's page, /learn/<topic> (`TOPIC_PAGES`, features/articles/topics.ts): /learn's list cut to the topic's articles, with
 * its own title and intro for a broader search than one article. Each topic is a folder beside this file with a page and a link
 * preview that call these.
 */

export function topicMetadata(topic: Topic): Metadata {
  const t = TOPIC_PAGES[topic];
  const path = `/learn/${topic}`;
  return { title: t.metaTitle, description: t.description, alternates: { canonical: path }, ...shareMeta({ path, title: t.title, description: t.description }) };
}

export function TopicPage({ topic }: { topic: Topic }) {
  const t = TOPIC_PAGES[topic];
  const articles = articlesOf(topic);
  return (
    <PageShell active="/learn" back={{ href: "/learn", label: "All guides" }} column title={t.title} intro={t.intro} decor={<GlassShapes />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(topicJsonLd(t, articles, SITE_URL)).replace(/</g, "\\u003c") }} />
      <LearnList articles={articles} topic={topic} />
      <JoinCard />
    </PageShell>
  );
}

export const topicImageAlt = "An open book in reading glasses, music notes flying out of it";

export const topicImage = (topic: Topic) => shareCard({ eyebrow: "Learn", title: TOPIC_PAGES[topic].title, path: `/learn/${topic}`, art: <BookArt /> });
