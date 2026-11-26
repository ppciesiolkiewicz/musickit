import Link from "next/link";
import Icon from "@/components/Icon";
import type { Article } from "../model";
import { articleStats } from "../stats";

/**
 * One article as a card linking to /learn/<slug>: its title, its intro, and what is on the page (how many exercises, or how
 * long it takes to read, and whether it listens to the mic). On /learn and under each article's "More guides".
 */
export default function ArticleCard({ article, heading: H = "h2" }: { article: Article; heading?: "h2" | "h3" }) {
  const { exercises, minutes } = articleStats(article);
  return (
    <Link
      href={`/learn/${article.slug}`}
      className="metal-panel group flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/50 hover:bg-slate-900/80 focus-visible:border-sky-400 focus-visible:outline-none"
    >
      <H className="text-lg leading-snug font-semibold text-slate-50 group-hover:text-sky-100">{article.title}</H>
      <p className="text-sm leading-relaxed text-slate-400">{article.intro}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
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
