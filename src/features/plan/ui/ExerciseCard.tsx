"use client";

import Icon from "@/components/Icon";
import { HUE_TONES, StarRating, hueAt, type Hue } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import Cells from "./Cells";
import { ExerciseSettings } from "@/components/practice/exerciseSettings";
import { catalogue, linkLabel, type CatalogueEntry } from "../model/catalogue";
import { hashtagLine } from "../model/hashtags";
import type { PlanExercise } from "../model/types";
import { STARS, STAR_LABELS, isStars, type Stars } from "@/features/progress/stars";

/** The left edge of the i-th exercise, written out whole so Tailwind sees it. */
const EDGE: Record<Hue, string> = {
  sky: "border-l-sky-400", amber: "border-l-amber-400", emerald: "border-l-emerald-400", rose: "border-l-rose-400",
  violet: "border-l-violet-400", teal: "border-l-teal-400", pink: "border-l-pink-400", red: "border-l-red-400",
};

/** The catalogue, built once for every card's link names. */
let pages: CatalogueEntry[] | null = null;

/**
 * A link slot: its title, then a link per page, "Learn <the page's name>", each opening in a new tab. On a phone a link is
 * only the page's short name: the slot's title already says what it is for.
 */
function LinkSlot({ title, hrefs }: { title: string; hrefs: string[] }) {
  if (!hrefs.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
      {hrefs.map((href) => (
        <a key={href} href={href} target="_blank" rel="noopener" className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-100 hover:border-sky-400 hover:bg-sky-500/20">
          <Icon name="book-open" size={12} />
          <span className="sm:hidden">{linkLabel(href, (pages ??= catalogue()), true) ?? href}</span>
          <span className="max-sm:hidden">Learn {linkLabel(href, pages) ?? href}</span>
        </a>
      ))}
    </div>
  );
}

/**
 * One exercise as the player sees it: a card coloured by its place in the day (`index`), the title in the display face,
 * its hashtags (area, level, kind) small and muted after it, "Learn before" links, its cells (text, steps and tools, set
 * up and ready to play), why, "Explore more" links, and the stars that rate it (and mark it done) when `onRate` is given.
 * `now` (the exercise the day timer is in) only lifts the card a little: the timer is a guide, not a rule.
 */
export default function ExerciseCard({ exercise: e, index, done = false, now = false, rating = null, onRate, address }: {
  exercise: PlanExercise; index: number; done?: boolean; now?: boolean;
  /** how the player rated it; null when not rated */ rating?: Stars | null;
  /** rate it (or clear the rating with null); without it the card has no stars */ onRate?: (stars: Stars | null) => void;
  /** which exercise, for a `SectionAside` */ address?: string;
}) {
  const hue = hueAt(index);
  const tags = hashtagLine(e);
  return (
    <section
      data-tour="plan-exercise"
      aria-label={e.title}
      aria-current={now ? "step" : undefined}
      className={`flex flex-col gap-3 rounded-2xl border border-l-4 p-3 transition sm:p-5 ${EDGE[hue]} ${done ? "border-emerald-500/40 bg-emerald-500/5" : now ? "border-slate-600 bg-slate-900/80 shadow-lg shadow-black/30" : "border-slate-800 bg-slate-900/50"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${HUE_TONES[hue].disc[1]}`}>{index + 1}</span>
        <h3 className={`text-xl ${done ? "text-slate-400 line-through" : "text-slate-50"}`} style={DISPLAY}>{e.title}</h3>
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Icon name="timer" size={12} />{e.minutes} min</span>
      </div>
      {tags && <p className="text-xs text-slate-500 sm:pl-11">{tags}</p>}
      <LinkSlot title="Learn before" hrefs={e.learnBefore ?? []} />
      <ExerciseSettings><Cells cells={e.cells} choice={e.choice} address={address} /></ExerciseSettings>
      {e.why && <p className="border-l-2 border-slate-700 pl-3 text-xs italic leading-relaxed text-slate-400">{e.why}</p>}
      <LinkSlot title="Explore more" hrefs={e.exploreMore ?? []} />
      {onRate && (
        <div className="flex flex-col gap-0.5 border-t border-slate-800 pt-3">
          <p className="text-sm text-slate-400">How did it go?</p>
          <StarRating value={rating} labels={STARS.map((s) => STAR_LABELS[s])} label="How did it go?" onChange={(v) => onRate(isStars(v) ? v : null)} />
        </div>
      )}
    </section>
  );
}
