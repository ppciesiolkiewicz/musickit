"use client";

import { useState } from "react";
import { TOPICS, type Article, type Topic } from "../model";
import ArticleCard from "./ArticleCard";

/** /learn's list of articles with a row of topic buttons over it: All, Singing, Guitar, Theory. Every card is in the page's HTML; the filter only hides cards. */
export default function LearnList({ articles }: { articles: Article[] }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500"}`;
  return (
    <>
      <div role="group" aria-label="Show guides about" className="mb-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={topic === null} className={chip(topic === null)} onClick={() => setTopic(null)}>All</button>
        {(Object.keys(TOPICS) as Topic[]).map((t) => (
          <button key={t} type="button" aria-pressed={topic === t} className={chip(topic === t)} onClick={() => setTopic(t)}>{TOPICS[t]}</button>
        ))}
      </div>
      <ul className="flex flex-col gap-4">
        {articles.map((a) => <li key={a.slug} hidden={topic !== null && !a.topics.includes(topic)}><ArticleCard article={a} /></li>)}
      </ul>
    </>
  );
}
