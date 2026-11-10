"use client";

import Icon from "@/components/Icon";
import { HUE_TONES, StarRating, hueAt, type Hue } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import Sections from "./Sections";
import { ExerciseSettings } from "@/components/practice/exerciseSettings";
import { catalogue, linkLabel, type CatalogueEntry } from "../model/catalogue";
import { linkSlots } from "../model/migrate";
import { sectionsOf } from "../model/tools";
import { AREAS } from "../model/concepts";
import { LEVELS, labelOf } from "../model/questions";
import type { PlanExercise } from "../model/types";
import { STARS, STAR_LABELS, isStars, type Stars } from "@/features/progress/stars";

/** Each tag keeps its colour wherever it shows. */
const TAG_HUES: Record<string, Hue> = { ear: "teal", sing: "pink", rhythm: "violet", technique: "amber", theory: "sky", improv: "emerald", song: "rose", "multi-octave": "red" };

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
 * focus, tags, "Learn before" links, its sections (text, steps and tools, set up and ready to play), why, "Explore more"
 * links, and the stars that rate it (and mark it done) when `onRate` is given. A phone shows the focus but not the level,
 * area and tags. `now` (the exercise the day timer is in) only lifts the card a little: the timer is a guide, not a rule.
 */
export default function ExerciseCard({ exercise: e, index, done = false, now = false, rating = null, onRate, address }: {
  exercise: PlanExercise; index: number; done?: boolean; now?: boolean;
  /** how the player rated it; null when not rated */ rating?: Stars | null;
  /** rate it (or clear the rating with null); without it the card has no stars */ onRate?: (stars: Stars | null) => void;
  /** which exercise, for a `SectionAside` */ address?: string;
}) {
  const hue = hueAt(index);
  const links = linkSlots(e);
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
      {(e.focus || e.level || e.area || e.tags?.length) && (
        <div className={`flex flex-wrap items-center gap-1.5 sm:pl-11 ${e.focus ? "" : "max-sm:hidden"}`}>
          {e.focus && <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-100">{e.focus}</span>}
          {e.level && <span className="max-sm:hidden rounded-full border border-slate-500/70 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-slate-200">{labelOf(LEVELS, e.level)}</span>}
          {e.area && <span className="max-sm:hidden rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">{labelOf(AREAS, e.area)}</span>}
          {e.tags?.map((t) => <span key={t} className={`max-sm:hidden rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium ${HUE_TONES[TAG_HUES[t] ?? "sky"].ink}`}>#{t}</span>)}
        </div>
      )}
      <LinkSlot title="Learn before" hrefs={links.learnBefore} />
      <ExerciseSettings><Sections sections={sectionsOf(e)} address={address} /></ExerciseSettings>
      {e.why && <p className="border-l-2 border-slate-700 pl-3 text-xs italic leading-relaxed text-slate-400">{e.why}</p>}
      <LinkSlot title="Explore more" hrefs={links.exploreMore} />
      {onRate && (
        <div className="flex flex-col gap-0.5 border-t border-slate-800 pt-3">
          <p className="text-sm text-slate-400">How did it go?</p>
          <StarRating value={rating} labels={STARS.map((s) => STAR_LABELS[s])} label="How did it go?" onChange={(v) => onRate(isStars(v) ? v : null)} />
        </div>
      )}
    </section>
  );
}
