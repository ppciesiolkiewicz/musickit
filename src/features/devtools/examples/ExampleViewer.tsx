"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Chip } from "@/components/ui";
import { SEED_BLOCKS, SEED_PLANS } from "@/features/library/seed";
import { DOC_VERSIONS, type DocVersions } from "@/features/library/seed/versions";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVELS, labelOf } from "@/features/plan/model/questions";
import type { Level } from "@/features/plan/model/types";
import { levelOf } from "@/features/plan/intake/answers";
import ExamplePreview from "../prompt/ExamplePreview";
import { parsePreview, planToCopy } from "../model/preview";
import { exerciseSteps, planSteps, type ConceptAt } from "../model/exampleSteps";
import { exampleSections, hashesOf, repinSectionNotes } from "../model/comments";
import type { CopyNote } from "../model/copyNotes";
import { useCopyNotes, useLinkedNote, useShowSections } from "../copy/store";
import { CommentCount, CommentsFor } from "./Comments";
import Icon from "@/components/Icon";
import { useMounted } from "../prompt/storage";

type Kind = "exercise" | "plan";
type Showcase = "blocks" | "pick" | "progression" | "stages" | "variants";

/** A seed plan or block as this page shows it (Task 5 folds the page into /dev/library). */
interface Item {
  id: string;
  kind: Kind;
  areas: Area[];
  level: Level;
  model?: string;
  docs: DocVersions;
  note: string;
  minutes?: number;
  showcase?: Showcase;
  json: string;
}

const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];

/** The seed files as items: a block's area and level as its exercise writes them, a plan's from its answers. */
const ITEMS: Item[] = [
  ...SEED_BLOCKS.map((f): Item => ({
    id: f.id, kind: "exercise", areas: [f.exercise.area as Area], level: (f.exercise.level as Level | undefined) ?? "new",
    model: f.model, docs: f.versions, note: f.note, showcase: f.showcase, json: JSON.stringify(f.exercise),
  })),
  ...SEED_PLANS.map((f): Item => ({
    id: f.id, kind: "plan", areas: f.answers.areas, level: f.answers.areas.map((a) => levelOf(f.answers, a)).sort((a, b) => LEVEL_ORDER.indexOf(b) - LEVEL_ORDER.indexOf(a))[0] ?? "new",
    model: f.model, docs: f.versions, note: f.note, minutes: f.answers.minutes, json: JSON.stringify(f.plan),
  })),
];

/** Copies the example as a complete plan (an exercise as a week of itself), ready for /plan's paste step. */
function CopyPlan({ json, note }: { json: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy as a complete 7-day plan, to paste into /plan"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        void navigator.clipboard.writeText(planToCopy(json, note)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={`ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-[0.97] ${copied ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-500/50 bg-sky-500/10 text-sky-100 hover:bg-sky-500/25"}`}
    >
      <Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy as plan"}
    </button>
  );
}

/** The tool types an example uses, walking its JSON for `{ type: "tool", tool: { type } }`, with how often each appears, in first-use order. */
function toolsUsed(value: unknown, counts = new Map<string, number>()): Map<string, number> {
  if (Array.isArray(value)) value.forEach((v) => toolsUsed(v, counts));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const tool = o.tool as { type?: unknown } | undefined;
    if (o.type === "tool" && typeof tool?.type === "string") counts.set(tool.type, (counts.get(tool.type) ?? 0) + 1);
    Object.values(o).forEach((v) => toolsUsed(v, counts));
  }
  return counts;
}

const pathHref = (concept: string) => `/dev/path?concept=${concept}`;
const stop = (ev: { stopPropagation: () => void }) => ev.stopPropagation();

/** A concept as a link to its box on /dev/path, with what was read for it after. */
function ConceptLink({ concept, label, children }: { concept: string; label: string; children?: ReactNode }) {
  return (
    <Link href={pathHref(concept)} onClick={stop} title="Open this concept on /dev/path" className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800/60 px-1.5 text-[11px] text-slate-200 hover:border-sky-500/60">
      {label}{children}
    </Link>
  );
}

const READ: Record<ConceptAt["read"], { className: string; title: string }> = {
  step: { className: "text-sky-300", title: "The step read from the exercise's tools" },
  "no-step": { className: "text-amber-300", title: "The concept has a ladder, but no tool here sets a level or stage: it counts for no step" },
  "no-ladder": { className: "text-slate-500", title: "The concept has no ladder in the code: no step can be read" },
};

/**
 * The concepts the example's exercises are tagged with, each with the step its tools say (`stepOf`), linked to /dev/path.
 * An exercise lists its own; a plan gathers them over its exercises and says how many are tagged with none.
 */
function StepsRow({ json, entries }: { json: string; entries: CatalogueEntry[] }) {
  const read = useMemo(() => {
    const p = parsePreview(json, entries);
    if (!p.ok) return null;
    if (p.exercise) return { kind: "exercise" as const, at: exerciseSteps(p.exercise) };
    return p.config ? { kind: "plan" as const, plan: planSteps(p.config.days.flatMap((d) => d.exercises)) } : null;
  }, [json, entries]);
  if (!read) return null;
  if (read.kind === "exercise") {
    if (!read.at.length) return <span className="text-xs text-rose-300">Tags no concept: counts for no concept or step.</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {read.at.map((c) => (
          <ConceptLink key={c.concept} concept={c.concept} label={c.label}>
            <span className={READ[c.read].className} title={READ[c.read].title}>· {c.read === "step" ? c.step : c.read === "no-step" ? "no step" : "no ladder"}</span>
          </ConceptLink>
        ))}
      </span>
    );
  }
  const { concepts, untagged, exercises } = read.plan;
  return (
    <span className="flex flex-col gap-1">
      {untagged > 0 && <span className="text-xs text-rose-300">{untagged} of {exercises} exercises tag no concept: they count for no concept or step.</span>}
      {concepts.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {concepts.map((c) => (
            <ConceptLink key={c.concept} concept={c.concept} label={c.label}>
              <span className="text-slate-500" title="Exercises tagged with it">×{c.exercises}</span>
              {c.steps.length > 0 && <span className={READ.step.className} title={READ.step.title}>· {c.steps.join(", ")}</span>}
              {c.noStep > 0 && <span className={READ["no-step"].className} title={READ["no-step"].title}>· {c.noStep} no step</span>}
              {!c.ladder && <span className={READ["no-ladder"].className} title={READ["no-ladder"].title}>· no ladder</span>}
            </ConceptLink>
          ))}
        </span>
      )}
    </span>
  );
}

/** A card per example; the preview mounts only while open (each one sets up its tools). */
function ExampleCard({ title, meta, note, json, entries, badge }: { /** the example's id */ title: string; meta?: ReactNode; note?: string; json: string; entries: CatalogueEntry[]; badge?: ReactNode }) {
  // opened or closed by hand, else open when the page was linked to one of its notes (from the Notes bar or /dev/notes)
  const [toggled, setOpen] = useState<boolean | null>(null);
  const linked = useLinkedNote();
  const linkedHere = useCopyNotes().some((n) => n.id === linked && n.section?.example === title);
  const open = toggled ?? linkedHere;
  const tools = useMemo(() => [...toolsUsed(JSON.parse(json))], [json]);
  return (
    <li className={`overflow-hidden rounded-2xl border shadow-sm border-slate-700 bg-slate-900/60`}>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className={`flex cursor-pointer flex-col gap-1 bg-slate-800/50 px-4 py-2.5 hover:bg-slate-800/80 ${open ? "border-b border-slate-700" : ""}`}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-sky-200">{title}</span>
            {badge}
            <CommentCount example={title} />
            <CopyPlan json={json} note={note} />
          </span>
          {meta}
          <StepsRow json={json} entries={entries} />
          {note && <span className="text-xs text-slate-400">{note}</span>}
          {tools.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {tools.map(([t, n]) => <span key={t} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 font-mono text-[11px] text-amber-200">{t}{n > 1 ? <span className="text-amber-200/60"> ×{n}</span> : null}</span>)}
            </span>
          )}
        </summary>
        {open && <div className="bg-slate-950/30 p-4"><CommentsFor example={title}><ExamplePreview json={json} entries={entries} /></CommentsFor></div>}
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

/** An example's teaching-skills version as a filter id ("v1"). */
const teachingOf = (e: { docs: DocVersions }): string => `v${e.docs.teaching}`;

/** One colour family per kind of tag, so a row of pills reads at a glance: border, fill and text together. */
const TONE = {
  fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  lime: "border-lime-500/40 bg-lime-500/10 text-lime-200",
  amber: "border-amber-500/30 bg-amber-500/5 text-amber-300/80",
  orange: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  pink: "border-pink-500/40 bg-pink-500/10 text-pink-200",
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  teal: "border-teal-500/40 bg-teal-500/10 text-teal-200",
  green: "border-green-500/40 bg-green-500/10 text-green-200",
  blue: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-200",
  indigo: "border-indigo-400/50 bg-indigo-500/15 text-indigo-100",
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/25",
  slate: "border-slate-600 bg-slate-800/40 text-slate-400",
} as const;
type Tone = keyof typeof TONE;

/** Examples written to a document's current version stand out; older ones are marked in a muted warm tone so they read as the ones to rewrite. */
const versionTone = (v: number, current: number): Tone => (v === current ? "lime" : "amber");
const KIND_TONE: Record<Kind, Tone> = { plan: "fuchsia", exercise: "rose" };
const AREA_TONE: Record<Area, Tone> = { guitar: "orange", voice: "pink", theory: "cyan" };
const LEVEL_TONE: Record<Level, Tone> = { new: "teal", beginner: "green", intermediate: "blue", advanced: "violet" };

function Pill({ tone, title, children }: { tone: Tone; title?: string; children: ReactNode }) {
  return <span title={title} className={`inline-block rounded-full border px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider ${TONE[tone]}`}>{children}</span>;
}

/** "claude-opus-5-5" → "Opus 5.5": the family, then the version numbers joined by dots. */
function modelLabel(id: string): string {
  const parts = id.replace(/^claude-/, "").split("-");
  const words = parts.filter((p) => !/^\d+$/.test(p)).map((w) => w[0].toUpperCase() + w.slice(1));
  const version = parts.filter((p) => /^\d+$/.test(p)).join(".");
  return [...words, version].filter(Boolean).join(" ");
}

/** The Model filter's id for examples written before the model was recorded. */
const NO_MODEL = "none";

/** Every seed plan and block, rendered as the player would see it, with filters. */
export default function ExampleViewer() {
  const mounted = useMounted();
  const entries = useMemo(() => catalogue(), []);
  const [kind, setKind] = useState<Kind | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [teaching, setTeaching] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  // every model that wrote an example, newest-looking first, then the ones written before the model was recorded
  const models = useMemo(() => {
    const all = ITEMS;
    const ids = [...new Set(all.map((e) => e.model).filter((m): m is string => !!m))].sort().reverse();
    const counted = (m: string | undefined) => all.filter((e) => e.model === m).length;
    return [
      ...ids.map((id) => ({ id, label: `${modelLabel(id)} (${counted(id)})` })),
      ...(all.some((e) => !e.model) ? [{ id: NO_MODEL, label: `Not recorded (${counted(undefined)})` }] : []),
    ];
  }, []);

  // every teaching-skills version an example was written to, newest first
  const teachingVersions = useMemo(() => {
    const all = ITEMS;
    return [...new Set(all.map((e) => e.docs.teaching))].sort((a, b) => b - a).map((v) => ({ id: `v${v}`, label: `Skills v${v}${v === DOC_VERSIONS.teaching ? " (current)" : ""} (${all.filter((e) => e.docs.teaching === v).length})` }));
  }, []);

  const library = useMemo(
    () =>
      ITEMS.filter(
        (e) =>
          (!kind || e.kind === kind) && (!area || e.areas.includes(area)) && (!level || e.level === level) &&
          (!showcase || e.showcase === showcase) &&
          (!teaching || teachingOf(e) === teaching) && (!model || (e.model ?? NO_MODEL) === model),
      ),
    [kind, area, level, showcase, teaching, model],
  );

  // every section of every example as it is now, filtered out or not: what the Notes bar checks section notes against and re-pins them to
  const shown = useMemo(() => {
    const sections = exampleSections(ITEMS.map((e) => ({ id: e.id, json: e.json })), entries);
    return { hashes: hashesOf(sections), repin: (notes: CopyNote[], files?: Record<string, { commit: string; dirty?: boolean }>) => repinSectionNotes(notes, sections, files) };
  }, [entries]);
  useShowSections(shown);

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Filter<Kind> label="Kind" value={kind} onChange={setKind} options={[{ id: "exercise", label: "Exercise" }, { id: "plan", label: "Plan" }]} />
          <Filter<Area> label="Area" value={area} onChange={setArea} options={AREAS} />
          <Filter<Level> label="Level" value={level} onChange={setLevel} options={LEVELS} />
          <Filter<Showcase> label="Showcase" value={showcase} onChange={setShowcase} options={[{ id: "blocks", label: "Blocks" }, { id: "pick", label: "Pick" }, { id: "progression", label: "Progression" }, { id: "stages", label: "Stages" }, { id: "variants", label: "Variants" }]} />
          <Filter<string> label="Teaching" value={teaching} onChange={setTeaching} options={teachingVersions} />
          <Filter<string> label="Model" value={model} onChange={setModel} options={models} />
        </div>
        <ul className="flex flex-col gap-2">
          {library.map((e) => (
            <ExampleCard
              key={e.id}
              title={e.id}
              badge={
                <>
                  <Pill tone={KIND_TONE[e.kind]}>{e.kind === "plan" ? "seed plan" : "seed block"}</Pill>
                  <Pill tone={versionTone(e.docs.teaching, DOC_VERSIONS.teaching)} title="The version of the teaching skills it was written to">teaching skills v{e.docs.teaching}</Pill>
                  <Pill tone={versionTone(e.docs.agents, DOC_VERSIONS.agents)} title="The version of AGENTS.md it was written to">AGENTS.md v{e.docs.agents}</Pill>
                  {e.areas.map((a) => <Pill key={a} tone={AREA_TONE[a]}>{labelOf(AREAS, a)}</Pill>)}
                  <Pill tone={LEVEL_TONE[e.level]}>{labelOf(LEVELS, e.level)}</Pill>
                  {e.model ? <Pill tone="indigo" title={e.model}>{modelLabel(e.model)}</Pill> : <Pill tone="slate" title="Written before the model was recorded">model not recorded</Pill>}
                </>
              }
              meta={e.kind === "plan" || e.showcase ? <span className="text-xs text-slate-500">{e.kind === "plan" ? `${e.minutes} min/day` : `showcase: ${e.showcase}`}</span> : undefined}
              note={e.note}
              json={e.json}
              entries={entries}
            />
          ))}
          {!library.length && <li className="text-sm text-slate-500">No example matches.</li>}
        </ul>
      </div>
    </div>
  );
}
