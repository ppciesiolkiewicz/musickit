"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { COURSE, sectionHref, stageColour } from "@/features/course/course";
import { noteKey } from "@/features/course/notes";
import type { CourseStage } from "@/features/course/model";
import Marks from "./Marks";

/**
 * A stage's sections: a labelled panel floating on the left on wide screens, a sideways-scrolling bar fixed to the bottom on phones.
 * Each section is its own page, so picking one navigates.
 */
export default function SectionPanel({ stage, current }: { stage: CourseStage; current: string }) {
  const i = COURSE.indexOf(stage);
  const prev = COURSE[i - 1], next = COURSE[i + 1];
  const colour = stageColour(stage.slug);
  const barCurrent = useRef<HTMLAnchorElement>(null);
  useEffect(() => { barCurrent.current?.scrollIntoView({ inline: "center", block: "nearest" }); }, [current]);

  return (
    <>
      <nav aria-label={`Stage ${stage.label} sections`} className="sticky top-4 hidden w-52 shrink-0 self-start rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-xl shadow-black/20 backdrop-blur lg:block">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage {stage.label}</p>
        <p className="mb-2 font-semibold text-slate-100">{stage.title}</p>
        <ol className="flex flex-col gap-0.5">
          {stage.sections.map((s) => {
            const on = s.slug === current;
            return (
              <li key={s.slug}>
                <Link
                  href={sectionHref(stage.slug, s.slug)}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition ${on ? "text-slate-50" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`}
                  style={on ? { background: `${colour}22`, boxShadow: `inset 0 0 0 1px ${colour}` } : undefined}
                >
                  <span className="min-w-0">{s.title}</span>
                  <Marks noteKey={noteKey(stage.slug, s.slug)} className="max-w-[5rem]" />
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-700/70 pt-2 text-xs text-slate-400">
          {prev ? <Link href={sectionHref(prev.slug, prev.sections[0].slug)} className="hover:text-slate-100" title={prev.title}>‹ {prev.label}</Link> : <span />}
          <Link href="/course" className="hover:text-slate-100">All stages</Link>
          {next ? <Link href={sectionHref(next.slug, next.sections[0].slug)} className="hover:text-slate-100" title={next.title}>{next.label} ›</Link> : <span />}
        </div>
      </nav>

      <nav aria-label={`Stage ${stage.label} sections`} className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-700/70 bg-slate-950/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <ol className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {stage.sections.map((s) => {
            const on = s.slug === current;
            return (
              <li key={s.slug} className="shrink-0">
                <Link
                  ref={on ? barCurrent : undefined}
                  href={sectionHref(stage.slug, s.slug)}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${on ? "text-slate-950" : "bg-slate-800/70 text-slate-300"}`}
                  style={on ? { background: colour } : undefined}
                >
                  {s.title}
                  <Marks noteKey={noteKey(stage.slug, s.slug)} className="max-w-[7rem] text-[10px] font-normal" />
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

/** The phone's stand-in for the panel's header: stage name with the neighbouring stages either side. */
export function StageLine({ stage }: { stage: CourseStage }) {
  const i = COURSE.indexOf(stage);
  const prev = COURSE[i - 1], next = COURSE[i + 1];
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 lg:hidden">
      {prev ? <Link href={sectionHref(prev.slug, prev.sections[0].slug)} className="hover:text-slate-100">‹ {prev.label}</Link> : <span />}
      <Link href="/course" className="truncate uppercase tracking-[0.15em] hover:text-slate-100">Stage {stage.label} · {stage.title}</Link>
      {next ? <Link href={sectionHref(next.slug, next.sections[0].slug)} className="hover:text-slate-100">{next.label} ›</Link> : <span />}
    </div>
  );
}
