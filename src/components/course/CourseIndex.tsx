"use client";

import Link from "next/link";
import { useState } from "react";
import { COURSE, byTopic, sectionHref, stageColour, type SectionRef } from "@/features/course/course";
import { noteKey } from "@/features/course/notes";
import { useAllNotes, useCourseLayout } from "./useCourseNotes";
import Marks from "./Marks";

type Filter = "warmup" | "often" | null;

function Row({ r, showStage }: { r: SectionRef; showStage: boolean }) {
  return (
    <li>
      <Link href={sectionHref(r.stage.slug, r.section.slug)} className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70 hover:text-white">
        <span className="min-w-0">
          {r.section.title}
          {showStage && <span className="ml-2 text-xs" style={{ color: stageColour(r.stage.slug) }}>{r.stage.label}</span>}
        </span>
        <Marks noteKey={noteKey(r.stage.slug, r.section.slug)} className="max-w-[45%] text-sm" />
      </Link>
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

/** The whole course, laid out by stage or grouped by topic, with the student's marks beside every section. */
export default function CourseIndex() {
  const [layout, setLayout] = useCourseLayout();
  const notes = useAllNotes();
  const [filter, setFilter] = useState<Filter>(null);
  const keep = (r: SectionRef) => {
    if (!filter) return true;
    const n = notes[noteKey(r.stage.slug, r.section.slug)];
    return filter === "warmup" ? !!n?.warmup : !!n?.often;
  };
  const groups = layout === "stage"
    ? COURSE.map((stage) => ({ id: stage.slug, title: `${stage.label} · ${stage.title}`, intro: stage.intro, colour: stageColour(stage.slug), items: stage.sections.map((section) => ({ stage, section })) }))
    : byTopic().map((g) => ({ id: g.topic.id, title: g.topic.label, intro: undefined, colour: undefined, items: g.items }));
  const shown = groups.map((g) => ({ ...g, items: g.items.filter(keep) })).filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-6">
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
      {shown.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">Nothing marked yet. Use My notes at the end of a section.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {shown.map((g) => (
          <section key={g.id} aria-labelledby={`g-${g.id}`} className="flex flex-col gap-2 rounded-3xl border border-slate-700/70 bg-slate-900/40 p-4">
            <h2 id={`g-${g.id}`} className="font-semibold text-slate-50" style={g.colour ? { color: g.colour } : undefined}>{g.title}</h2>
            {g.intro && <p className="text-sm text-slate-400">{g.intro}</p>}
            <ol className="mt-1 flex flex-col gap-1">{g.items.map((r) => <Row key={`${r.stage.slug}/${r.section.slug}`} r={r} showStage={layout === "topic"} />)}</ol>
          </section>
        ))}
      </div>
    </div>
  );
}
