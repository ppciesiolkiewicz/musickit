import Link from "next/link";
import { TOPICS, type Article, type Topic } from "../model";
import ArticleCard from "./ArticleCard";
import { TOPIC_STYLE, tagOf } from "./topicTags";

/**
 * A list of articles with a row of topic links over it: All (/learn), #Singing, #Guitar, #Theory (/learn/<topic>), each topic in
 * its colour, the page's own one lit. Links, not a filter, so a search engine finds each topic's page.
 */
export default function LearnList({ articles, topic = null }: { articles: Article[]; topic?: Topic | null }) {
  const chip = (on: boolean, t?: Topic) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${t ? TOPIC_STYLE[t][on ? "on" : "off"] : on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500"}`;
  return (
    <>
      <nav aria-label="Guides by topic" className="mb-4 flex flex-wrap gap-2">
        <Link href="/learn" aria-current={topic === null ? "page" : undefined} className={chip(topic === null)}>All</Link>
        {(Object.keys(TOPICS) as Topic[]).map((t) => (
          <Link key={t} href={`/learn/${t}`} aria-current={topic === t ? "page" : undefined} className={chip(topic === t, t)}>{tagOf(t)}</Link>
        ))}
      </nav>
      <ul className="flex flex-col gap-4">
        {articles.map((a) => <li key={a.slug}><ArticleCard article={a} /></li>)}
      </ul>
    </>
  );
}
