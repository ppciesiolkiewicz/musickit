"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Badge, Chip } from "@/components/ui";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { AREAS, conceptById, type Area } from "@/features/plan/model/concepts";
import { selectExamples } from "@/features/plan/model/exampleSelection";
import { promptParts } from "@/features/plan/model/prompt";
import { LEVELS, labelOf } from "@/features/plan/model/questions";
import type { Level } from "@/features/plan/model/types";
import Sections from "@/features/plan/ui/Sections";
import { answersFromText } from "../model/compose";
import { parsePreview, previewPlanText, whyOf } from "../model/preview";
import PlanPreview from "../prompt/PlanPreview";
import { loadStudio, useMounted } from "../prompt/storage";

type Kind = "exercise" | "plan";
type Showcase = "blocks" | "pick" | "progression";

/** One example rendered: an exercise as its header and sections, a plan as the week view; the parser's warnings above. */
function Rendered({ json, entries }: { json: string; entries: CatalogueEntry[] }) {
  const p = useMemo(() => parsePreview(json, entries), [json, entries]);
  if (!p.ok) return <p role="alert" className="text-sm text-rose-300">Doesn&apos;t parse: {p.error}</p>;
  return (
    <div className="flex flex-col gap-3">
      {p.warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300/90">{p.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
      {p.exercise ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="font-semibold text-slate-100">{p.exercise.title}</h4>
            {p.exercise.focus && <span className="text-xs text-sky-300">{p.exercise.focus}</span>}
            <span className="text-xs text-slate-500">{p.exercise.minutes} min</span>
          </div>
          {p.exercise.why && <p className="text-sm text-slate-400">{p.exercise.why}</p>}
          <Sections sections={p.exercise.sections ?? []} />
        </div>
      ) : (
        <PlanPreview reply={previewPlanText(json)} />
      )}
    </div>
  );
}

/** A card per example; the preview mounts only while open (each one sets up its tools). */
function ExampleCard({ title, meta, note, json, entries, badge }: { title: string; meta?: ReactNode; note?: string; json: string; entries: CatalogueEntry[]; badge?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/40">
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer flex-col gap-1 px-3 py-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-sky-200">{title}</span>
            {badge}
            {meta}
          </span>
          {note && <span className="text-xs text-slate-400">{note}</span>}
        </summary>
        {open && <div className="border-t border-slate-800 p-3"><Rendered json={json} entries={entries} /></div>}
      </details>
    </li>
  );
}

function Filter<V extends string>({ label, value, options, onChange }: { label: string; value: V | null; options: { id: V; label: string }[]; onChange: (v: V | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <span className="w-16">{label}</span>
      <Chip on={value === null} onClick={() => onChange(null)}>All</Chip>
      {options.map((o) => <Chip key={o.id} on={value === o.id} onClick={() => onChange(value === o.id ? null : o.id)}>{o.label}</Chip>)}
    </div>
  );
}

/**
 * The prompt's examples, rendered as the player would see them: "In the prompt" lists the example parts built for the
 * studio's current answers; "Library" lists every example with filters, marking the ones those answers put in the prompt.
 */
export default function ExampleViewer() {
  const mounted = useMounted();
  const entries = useMemo(() => catalogue(), []);
  const [tab, setTab] = useState<"prompt" | "library">("prompt");
  const [kind, setKind] = useState<Kind | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [showcase, setShowcase] = useState<Showcase | null>(null);

  const read = useMemo(() => (mounted ? answersFromText(loadStudio().answersText) : null), [mounted]);
  const answers = read && !read.error ? read.answers : null;
  const inPrompt = useMemo(() => {
    if (!answers) return new Set<string>();
    const s = selectExamples(answers);
    return new Set([...s.exercises.map((e) => e.id), s.plan.id]);
  }, [answers]);
  const parts = useMemo(() => (mounted ? promptParts(answers, entries).filter((p) => p.kind === "example" && p.example) : []), [mounted, answers, entries]);
  const library = useMemo(
    () =>
      [...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES].filter(
        (e) =>
          (!kind || e.kind === kind) && (!area || e.areas.includes(area)) && (!level || e.level === level) &&
          (!showcase || (e.kind === "exercise" && e.showcase === showcase)),
      ),
    [kind, area, level, showcase],
  );

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Answers from the <Link href="/dev/prompt" className="text-sky-300 underline">prompt studio</Link>
        {read?.error ? ` don't parse (${read.error}); showing the skipped-questionnaire prompt.` : answers ? "." : " say the questionnaire was skipped."}
      </p>
      <div className="flex gap-2">
        <Chip on={tab === "prompt"} onClick={() => setTab("prompt")} count={parts.length}>In the prompt</Chip>
        <Chip on={tab === "library"} onClick={() => setTab("library")} count={EXERCISE_EXAMPLES.length + PLAN_EXAMPLES.length}>Library</Chip>
      </div>
      {tab === "prompt" ? (
        parts.length ? (
          <ul className="flex flex-col gap-2">
            {parts.map((p) => <ExampleCard key={p.id} title={p.example!.id} note={whyOf(p.text)} json={p.example!.json} entries={entries} />)}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">This prompt carries no examples.</p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Filter<Kind> label="Kind" value={kind} onChange={setKind} options={[{ id: "exercise", label: "Exercise" }, { id: "plan", label: "Plan" }]} />
            <Filter<Area> label="Area" value={area} onChange={setArea} options={AREAS} />
            <Filter<Level> label="Level" value={level} onChange={setLevel} options={LEVELS} />
            <Filter<Showcase> label="Showcase" value={showcase} onChange={setShowcase} options={[{ id: "blocks", label: "Blocks" }, { id: "pick", label: "Pick" }, { id: "progression", label: "Progression" }]} />
          </div>
          <ul className="flex flex-col gap-2">
            {library.map((e) => (
              <ExampleCard
                key={e.id}
                title={e.id}
                badge={inPrompt.has(e.id) ? <Badge className="text-emerald-300">in prompt</Badge> : undefined}
                meta={
                  <span className="text-xs text-slate-500">
                    {e.kind === "plan" ? `plan · ${e.minutes} min/day` : e.showcase ? `showcase: ${e.showcase}` : "exercise"} · {e.areas.map((a) => labelOf(AREAS, a)).join(" + ")} · {labelOf(LEVELS, e.level)} · {e.concepts.map((c) => conceptById(c)?.label ?? c).join(", ")}
                  </span>
                }
                note={e.note}
                json={JSON.stringify(e.kind === "plan" ? e.plan : e.exercise)}
                entries={entries}
              />
            ))}
            {!library.length && <li className="text-sm text-slate-500">No example matches.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
