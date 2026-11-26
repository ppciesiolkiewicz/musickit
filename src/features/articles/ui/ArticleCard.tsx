import Image from "next/image";
import Link from "next/link";
import { articleArt } from "../art";
import Icon from "@/components/Icon";
import type { Article } from "../model";
import { articleStats } from "../stats";
import { TOPIC_STYLE, tagOf } from "./topicTags";

/**
 * One article as a card linking to /learn/<slug>: its title, its intro, and what is on the page (how many exercises, or how
 * long it takes to read, and whether it listens to the mic), with its topic tags first (#Singing, each topic its own colour: `topicTags.ts`). On /learn and under each article's "More guides".
 */
export default function ArticleCard({ article, heading: H = "h2" }: { article: Article; heading?: "h2" | "h3" }) {
  const { exercises, minutes } = articleStats(article);
  return (
    <Link
      href={`/learn/${article.slug}`}
      className="metal-panel group flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/50 hover:bg-slate-900/80 focus-visible:border-sky-400 focus-visible:outline-none"
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 sm:gap-x-6">
        <H className="min-w-0 text-lg leading-snug font-semibold text-slate-50 group-hover:text-sky-100">{article.title}</H>
        <Image src={articleArt(article.slug)} width={1200} height={480} alt="" unoptimized className="aspect-5/2 w-28 rounded-lg border border-slate-800 object-cover transition group-hover:border-sky-500/40 sm:row-span-2 sm:w-44" />
        <p className="col-span-2 text-sm leading-relaxed text-slate-400 sm:col-span-1">{article.intro}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
        {article.topics.map((t) => (
          <span key={t} className={`rounded-full border px-2.5 py-1 font-medium ${TOPIC_STYLE[t].tag}`}>{tagOf(t)}</span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1">
          <Icon name={exercises ? "target" : "book-open"} size={13} className="text-sky-300" />
          {exercises ? `${exercises} exercises` : `${minutes}-minute read`}
        </span>
        {article.sings && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1">
            <Icon name="mic" size={13} className="text-sky-300" /> Uses your mic
          </span>
        )}
        <span aria-hidden className="ml-auto inline-flex items-center gap-1 font-medium text-sky-300 transition group-hover:translate-x-0.5">
          Read <Icon name="chevron-right" size={14} />
        </span>
      </div>
    </Link>
  );
}
