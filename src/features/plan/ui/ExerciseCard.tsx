"use client";

import { withKeys } from "../model/keys";
import { applyGiven, type At } from "../model/moves";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { HUE_TONES, Popover, StarRating, hueAt, type Hue } from "@/components/ui";
import { BlockBody, BlockTitle } from "./reader/BlockArticle";
import { ExerciseSettings } from "@/components/practice/exerciseSettings";
import { catalogue, linkLabel, type CatalogueEntry } from "../model/catalogue";
import { hashtagLine } from "../model/hashtags";
import type { Block, PlanExercise } from "../model/types";
import { STARS, STAR_LABELS, isStars, type Stars } from "@/features/progress/stars";
import type { Picks } from "../model/choice";
import CellVideo from "@/features/contentVideos/ui/CellVideo";
import { drawnAsks } from "@/features/contentVideos/model/drawn";
import type { CellAsk } from "@/features/contentVideos/model/slot";
import type { PlayInfo } from "@/features/contentVideos/server/access";

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
 * its hashtags (area, level, kind) small and muted after it, "Learn before" links, its block read by the reader (`BlockBody`) (text, steps and tools, set
 * up and ready to play), why, "Explore more" links, and the stars that rate it (and mark it done) when `onRate` is given.
 * `now` (the card in view while the day timer runs) only lifts the card a little: the timer is a guide, not a rule. With
 * `spent`, the planned minutes become `SpentTime`: time on it so far of the time planned, with a bar that fills to green.
 * `videos` puts a Watch video button right above each tool that has one (`CellVideo`); the card holds where its chips
 * stand and tells the day its tools as drawn (`onAsks`), so the video follows a chip that changes the level.
 */
export default function ExerciseCard({ exercise: e, index, done = false, now = false, ticking = false, spent, rating = null, onRate, ratedBy, address, tour = true, videos, onAsks, afterTool }: {
  exercise: PlanExercise; index: number; done?: boolean; now?: boolean;
  /** the day timer is counting this exercise's time: its timer shows it ticking */ ticking?: boolean;
  /** seconds spent on it so far; without it only the planned minutes show */ spent?: number;
  /** how the player rated it; null when not rated */ rating?: Stars | null;
  /** rate it (or clear the rating with null); without it the card has no stars */ onRate?: (stars: Stars | null) => void;
  /** read-only, someone else's plan (a teacher's view of a student's week): their stars, under their name, once rated */ ratedBy?: string;
  /** which exercise, for a `CellAside` */ address?: string;
  /** carries the page tour's hook (`plan-exercise`); off for a past day shown under today's */ tour?: boolean;
  /** by tool cell: the content video shown above it */ videos?: Record<number, PlayInfo>;
  /** its tool cells as drawn now, each time the chips move them */ onAsks?: (asks: CellAsk[]) => void;
  /** drawn right under each tool, by its tool cell (the library's video strip) */ afterTool?: (cell: number) => ReactNode;
}) {
  const hue = hueAt(index);
  const tags = hashtagLine(e);
  // the reader gets the block alone, never what the plan knows about it
  // with the player's keys in its Key selector, when the composer gave the exercise some
  // a block with moves is drawn in its version by the reader; the title follows where the version's chips stand
  const block: Block = withKeys({ title: e.title, ...(e.choice ? { choice: e.choice } : {}), ...(e.moves ? { moves: e.moves } : {}), cells: e.cells }, e.moves ? null : e.given?.keys);
  const [at, setAt] = useState<At>({});
  const [picks, setPicks] = useState<Picks>({});
  // the tools as drawn, for the day's video lookup; reported only when they change
  const asks = useMemo(() => JSON.stringify(drawnAsks(block, e.given, at, picks)), [block, e.given, at, picks]);
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (!onAsks || told.current === asks) return;
    told.current = asks;
    onAsks(JSON.parse(asks) as CellAsk[]);
  }, [asks, onAsks]);
  const title = applyGiven(block, e.given, at).title;
  // the planned time reached: the whole card turns green with a soft glow, and flashes brighter at the moment it happens
  const reached = spent !== undefined && e.minutes > 0 && spent >= e.minutes * 60;
  const [was, setWas] = useState(reached);
  const [flash, setFlash] = useState(false);
  if (reached !== was) {
    setWas(reached);
    if (reached && ticking) setFlash(true);
  }
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [flash]);
  // while the timer counts it, a blue glow fades in slowly and grows with the time spent, until the card turns green
  const part = spent !== undefined && e.minutes > 0 ? Math.min(1, spent / (e.minutes * 60)) : 0;
  const glow = ticking && !reached && !flash ? { boxShadow: `0 0 ${12 + 28 * part}px rgb(56 189 248 / ${0.15 + 0.35 * part})` } : undefined;
  return (
    <section
      data-tour={tour ? "plan-exercise" : undefined}
      aria-label={title}
      aria-current={now ? "step" : undefined}
      style={glow}
      className={`flex flex-col gap-3 rounded-2xl border border-l-4 p-3 transition-all ${ticking && !reached ? "duration-[1500ms]" : "duration-700"} sm:p-5 ${EDGE[hue]} ${flash ? "border-emerald-300 bg-emerald-500/20 shadow-[0_0_40px] shadow-emerald-400/50 ring-2 ring-emerald-300/70" : reached ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_24px] shadow-emerald-400/25" : ticking ? "border-sky-400/50 bg-sky-500/5" : done ? "border-emerald-500/40 bg-emerald-500/5" : now ? "border-slate-600 bg-slate-900/80 shadow-lg shadow-black/30" : "border-slate-800 bg-slate-900/50"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${HUE_TONES[hue].disc[1]}`}>{index + 1}</span>
        <BlockTitle title={title} size="card" done={done} />
        {tags && <span className="text-xs text-slate-500">{tags}</span>}
        {spent === undefined
          ? <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Icon name="timer" size={12} />{e.minutes} min</span>
          : <SpentTime seconds={spent} minutes={e.minutes} ticking={ticking} />}
      </div>
      <LinkSlot title="Learn before" hrefs={e.learnBefore ?? []} />
      <ExerciseSettings><BlockBody block={block} size="card" address={address} given={e.given} at={at} onAt={setAt} picks={picks} onPicks={setPicks} beforeTool={(cell) => (videos?.[cell] ? <CellVideo key={videos[cell].id} video={videos[cell]} /> : null)} afterTool={afterTool} /></ExerciseSettings>
      {e.why && <p className="border-l-2 border-slate-700 pl-3 text-xs italic leading-relaxed text-slate-400">{e.why}</p>}
      <LinkSlot title="Explore more" hrefs={e.exploreMore ?? []} />
      {spent !== undefined && <span className="self-end"><SpentBar seconds={spent} minutes={e.minutes} ticking={ticking} small /></span>}
      {onRate && (
        <div className={`flex flex-col gap-1 rounded-xl border p-3 sm:p-4 ${rating === null ? "border-amber-400/50 bg-amber-500/10" : "border-slate-700 bg-slate-800/40"}`}>
          <p className={`text-base font-semibold ${rating === null ? "text-amber-100" : "text-slate-200"}`}>How did it go?</p>
          <StarRating value={rating} labels={STARS.map((s) => STAR_LABELS[s])} label="How did it go?" onChange={(v) => onRate(isStars(v) ? v : null)} />
          <p className="text-xs text-slate-400">Your stars shape the next plan: 1 or 2 makes it easier, 3 keeps it the same, 4 or 5 moves you on.</p>
        </div>
      )}
      {!onRate && ratedBy && rating !== null && (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-800/40 p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-200">How it went for {ratedBy}</p>
          <StarRating value={rating} labels={STARS.map((s) => STAR_LABELS[s])} label={`How it went for ${ratedBy}:`} size="sm" />
        </div>
      )}
    </section>
  );
}

/**
 * Time on an exercise of the time planned ("2 min / 5 min") over a thin bar: sky while it fills, green once the planned time
 * is reached, a brighter green with a glow past half again, and a star at twice the planned time. Hover (or tap) for what
 * the numbers mean.
 */
function SpentTime({ seconds, minutes, ticking }: { seconds: number; minutes: number; ticking: boolean }) {
  const [open, setOpen] = useState(false);
  const p = minutes > 0 ? seconds / (minutes * 60) : 0;
  const note = p >= 2 ? `Time on this exercise so far: twice the ${minutes} min planned.` : `Time on this exercise so far, of ${minutes} min planned.`;
  return (
    <span className="ml-auto">
      <Popover open={open} side="left" content={note}>
        <button
          type="button"
          onPointerEnter={(ev) => ev.pointerType === "mouse" && setOpen(true)}
          onPointerLeave={(ev) => ev.pointerType === "mouse" && setOpen(false)}
          onClick={() => setOpen((o) => !o)}
          onBlur={() => setOpen(false)}
          aria-label={note}
          className="flex cursor-default flex-col items-end gap-1"
        >
          <SpentBar seconds={seconds} minutes={minutes} ticking={ticking} />
        </button>
      </Popover>
    </span>
  );
}

/**
 * The numbers and bar of `SpentTime` alone, no hover note. `small` is the muted copy in the card's bottom-right corner.
 * `ticking` (the day timer is counting this exercise): a glow behind the numbers and icon fades in over 1.5 s, breathes
 * slowly, and settles to half after 10 s (blue, green once the planned time is reached). The bar stays still.
 */
function SpentBar({ seconds, minutes, small = false, ticking = false }: { seconds: number; minutes: number; small?: boolean; ticking?: boolean }) {
  const p = minutes > 0 ? seconds / (minutes * 60) : 0;
  const bar = p >= 2 ? "bg-emerald-300 shadow-[0_0_8px] shadow-emerald-300/80" : p >= 1.5 ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" : p >= 1 ? "bg-emerald-500" : "bg-sky-400";
  const icon = small ? 10 : 12;
  const green = p >= 1;
  // the glow breathes slowly while the timer counts
  const pulse = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ticking) return;
    const a = pulse.current?.animate?.([{ opacity: 0.6, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.03)" }], { duration: 2400, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    return () => a?.cancel();
  }, [ticking]);
  // after 10 s on the same exercise the glow settles down a little (back to full when it starts counting again)
  const [settled, setSettled] = useState(false);
  const [wasTicking, setWasTicking] = useState(ticking);
  if (ticking !== wasTicking) {
    setWasTicking(ticking);
    setSettled(false);
  }
  useEffect(() => {
    if (!ticking) return;
    const t = setTimeout(() => setSettled(true), 10_000);
    return () => clearTimeout(t);
  }, [ticking]);
  return (
    <span className={`flex flex-col items-end ${small ? "gap-0.5 opacity-40" : "gap-1"}`}>
      <span className={`relative flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums transition-[color,background-color,box-shadow] duration-[1500ms] ${small ? "text-[10px]" : "text-xs"} ${green ? "text-emerald-200" : ticking ? "text-sky-100" : "text-slate-400"} ${ticking ? (green ? "bg-emerald-500/15 ring-1 ring-emerald-400/60" : "bg-sky-500/15 ring-1 ring-sky-400/60") : "ring-0 ring-transparent"}`}>
        <span aria-hidden className={`pointer-events-none absolute -inset-1.5 transition-opacity ${settled ? "duration-[3000ms]" : "duration-[1500ms]"} ${ticking ? (settled ? "opacity-50" : "opacity-100") : "opacity-0"}`}>
          <span ref={pulse} className={`block size-full rounded-full blur-md ${green ? "bg-emerald-400/35" : "bg-sky-400/35"}`} />
        </span>
        <span className="relative flex items-center gap-1">
          {p >= 2 ? <Icon name="star" size={icon} fill className="text-amber-300" /> : <Icon name="timer" size={icon} />}
          {Math.floor(seconds / 60)} min / {minutes} min
        </span>
      </span>
      <span aria-hidden className={`w-full overflow-hidden rounded-full bg-slate-800 ${small ? "h-0.5" : "h-1"}`}>
        <span className={`block h-full rounded-full transition-[width] duration-500 ${bar}`} style={{ width: `${Math.min(1, p) * 100}%` }} />
      </span>
    </span>
  );
}
