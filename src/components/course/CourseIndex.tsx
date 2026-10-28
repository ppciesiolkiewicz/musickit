"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import { ALL_SECTIONS, COURSE, byTopic, sectionHref, stageColour, type SectionRef } from "@/features/course/course";
import { noteKey } from "@/features/course/notes";
import { useAllNotes, useCourseLayout } from "./useCourseNotes";
import Marks from "./Marks";

type Filter = "warmup" | "often" | null;

/** A section with no blocks yet is planned: listed, but not a link. */
const planned = (r: SectionRef) => r.section.blocks.length === 0;

function Row({ r, n, showStage }: { r: SectionRef; n: number; showStage: boolean }) {
  const colour = stageColour(r.stage.slug);
  const inner = (
    <>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-500">{showStage ? <span className="inline-block size-2 rounded-full" style={{ background: colour }} /> : n}</span>
      <span className="min-w-0 flex-1 truncate">
        {r.section.title}
        {showStage && <span className="ml-2 text-xs" style={{ color: colour }}>{r.stage.label}</span>}
      </span>
      {planned(r)
        ? <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">soon</span>
        : <Marks noteKey={noteKey(r.stage.slug, r.section.slug)} className="max-w-[40%] text-sm" />}
    </>
  );
  const base = "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm";
  return (
    <li>
      {planned(r)
        ? <span className={`${base} text-slate-500`}>{inner}</span>
        : <Link href={sectionHref(r.stage.slug, r.section.slug)} className={`${base} group text-slate-200 transition hover:bg-slate-800/70 hover:text-white`}>{inner}</Link>}
    </li>
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-full border border-slate-600 text-sm">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`px-3.5 py-1.5 transition ${value === o.id ? "bg-amber-400 font-semibold text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const READY = ALL_SECTIONS.filter((r) => !planned(r)).length;

/** The whole course, laid out by stage down a path or grouped by topic, with the student's marks beside every section. */
export default function CourseIndex() {
  const [layout, setLayout] = useCourseLayout();
  const notes = useAllNotes();
  const [filter, setFilter] = useState<Filter>(null);
  const keep = (r: SectionRef) => {
    if (!filter) return true;
    const n = notes[noteKey(r.stage.slug, r.section.slug)];
    return filter === "warmup" ? !!n?.warmup : !!n?.often;
  };
  const stages = COURSE.map((stage) => ({ stage, items: stage.sections.map((section) => ({ stage, section })).filter(keep) })).filter((g) => g.items.length);
  const topics = byTopic().map((g) => ({ ...g, items: g.items.filter(keep) })).filter((g) => g.items.length);
  const empty = layout === "stage" ? !stages.length : !topics.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-700/70 bg-slate-900/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            <span className="text-slate-100">{COURSE.length} stages</span> · {READY} sections to play · {byTopic().length} topics
          </p>
          <Link href={sectionHref(COURSE[0].slug, COURSE[0].sections[0].slug)} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
            Start at the beginning <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Toggle label="Layout" value={layout} onChange={setLayout} options={[{ id: "stage", label: "By stage" }, { id: "topic", label: "By topic" }]} />
          <div className="flex flex-wrap gap-1.5">
            {([["warmup", "🔥 Warm-ups"], ["often", "🔁 Come back often"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(filter === id ? null : id)} className={`rounded-full border px-3 py-1.5 text-sm transition ${filter === id ? "border-amber-400 bg-amber-400/15 text-slate-50" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {layout === "stage" && !filter && (
          <nav aria-label="Jump to a stage" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {COURSE.map((s) => (
              <a key={s.slug} href={`#stage-${s.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 py-1 pl-1 pr-3 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white">
                <span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-slate-950" style={{ background: stageColour(s.slug) }}>{s.label}</span>
                {s.title}
              </a>
            ))}
          </nav>
        )}
      </div>

      {empty && <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">Nothing marked yet. Use My notes at the end of a section.</p>}

      {layout === "stage" ? (
        <ol className="relative flex flex-col gap-5">
          <span aria-hidden className="absolute bottom-8 left-[1.2rem] top-8 w-0.5 bg-linear-to-b from-teal-400/50 via-violet-400/40 to-rose-400/50 sm:left-[1.45rem]" />
          {stages.map(({ stage, items }) => {
            const colour = stageColour(stage.slug);
            const first = stage.sections.find((x) => x.blocks.length);
            return (
              <li key={stage.slug} id={`stage-${stage.slug}`} className="relative flex scroll-mt-20 gap-3 sm:gap-5">
                <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-slate-950 ring-8 ring-slate-950/70 sm:size-12" style={{ background: colour }}>{stage.label}</span>
                <section aria-labelledby={`s-${stage.slug}`} className="relative min-w-0 flex-1 overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/50 p-4 transition hover:border-slate-500 sm:p-5">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25" style={{ background: `radial-gradient(60% 90% at 100% 0%, ${colour}55, transparent)` }} />
                  {/* the whole card opens the stage; the header lets clicks through, the section rows sit above as their own links */}
                  {first && <Link href={sectionHref(stage.slug, first.slug)} aria-hidden tabIndex={-1} className="absolute inset-0" />}
                  <div className="pointer-events-none relative flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: colour }}>Stage {stage.label} · {stage.sections.length} sections</p>
                      <h2 id={`s-${stage.slug}`} className="mt-1 text-2xl text-slate-50 sm:text-3xl" style={DISPLAY}>{stage.title}</h2>
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{stage.intro}</p>
                    </div>
                    {first && (
                      <Link href={sectionHref(stage.slug, first.slug)} className="pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-600 px-3 py-1.5 text-sm text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                        Open <Icon name="chevron-right" size={16} />
                      </Link>
                    )}
                  </div>
                  <ol className="relative mt-4 grid gap-x-4 gap-y-0.5 border-t border-slate-800/80 pt-3 md:grid-cols-2">
                    {items.map((r) => <Row key={r.section.slug} r={r} n={stage.sections.indexOf(r.section) + 1} showStage={false} />)}
                  </ol>
                </section>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((g) => (
            <section key={g.topic.id} aria-labelledby={`t-${g.topic.id}`} className="flex flex-col gap-1 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-4">
              <h2 id={`t-${g.topic.id}`} className="flex items-baseline justify-between gap-2 px-2.5 text-xl text-slate-50" style={DISPLAY}>
                {g.topic.label}
                <span className="text-xs text-slate-500">{g.items.length}</span>
              </h2>
              <ol className="mt-1 flex flex-col gap-0.5">{g.items.map((r, i) => <Row key={`${r.stage.slug}/${r.section.slug}`} r={r} n={i + 1} showStage />)}</ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
