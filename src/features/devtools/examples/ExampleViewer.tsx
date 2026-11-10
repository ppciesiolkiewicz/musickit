"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Chip } from "@/components/ui";
import { DOC_VERSIONS, EXERCISE_EXAMPLES, PLAN_EXAMPLES, type DocVersions } from "@/features/plan/examples";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { AREAS, conceptById, type Area } from "@/features/plan/model/concepts";
import { selectExamples } from "@/features/plan/model/exampleSelection";
import { LEVELS, labelOf } from "@/features/plan/model/questions";
import type { Level } from "@/features/plan/model/types";
import { answersFromText } from "../model/compose";
import { partAnchor } from "../prompt/PartList";
import ExamplePreview from "../prompt/ExamplePreview";
import { planToCopy } from "../model/preview";
import { exampleSections, hashesOf, repinSectionNotes } from "../model/comments";
import type { CopyNote } from "../model/copyNotes";
import { useCopyNotes, useLinkedNote, useShowSections } from "../copy/store";
import { CommentCount, CommentsFor } from "./Comments";
import Icon from "@/components/Icon";
import { loadStudio, useMounted } from "../prompt/storage";

type Kind = "exercise" | "plan";
type Showcase = "blocks" | "pick" | "progression";

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

/** A card per example; the preview mounts only while open (each one sets up its tools). */
function ExampleCard({ title, meta, note, json, entries, badge, changes, paired }: { /** the example's id */ title: string; meta?: ReactNode; note?: string; json: string; entries: CatalogueEntry[]; badge?: ReactNode; /** what a rewrite changed from the example it rewrites */ changes?: string[]; /** listed right under the example it rewrites */ paired?: boolean }) {
  // opened or closed by hand, else open when the page was linked to one of its notes (from the Notes bar or /dev/notes)
  const [toggled, setOpen] = useState<boolean | null>(null);
  const linked = useLinkedNote();
  const linkedHere = useCopyNotes().some((n) => n.id === linked && n.section?.example === title);
  const open = toggled ?? linkedHere;
  const tools = useMemo(() => [...toolsUsed(JSON.parse(json))], [json]);
  return (
    <li className={`overflow-hidden rounded-2xl border shadow-sm ${paired ? "ml-6 border-lime-500/30" : "border-slate-700"} bg-slate-900/60`}>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className={`flex cursor-pointer flex-col gap-1 bg-slate-800/50 px-4 py-2.5 hover:bg-slate-800/80 ${open ? "border-b border-slate-700" : ""}`}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-sky-200">{title}</span>
            {badge}
            <CommentCount example={title} />
            <CopyPlan json={json} note={note} />
          </span>
          {meta}
          {note && <span className="text-xs text-slate-400">{note}</span>}
          {changes && changes.length > 0 && (
            <ul className="ml-4 list-disc text-xs text-lime-200/80">
              {changes.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
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

/** Library order, except a rewrite comes right after the example it rewrites, so the two read one under the other. */
function pairRewrites<E extends { id: string; rewrites?: { id: string } }>(list: E[]): E[] {
  const at = (id: string) => { const i = list.findIndex((x) => x.id === id); return i < 0 ? list.length : i; };
  return [...list].sort((a, b) => at(a.rewrites?.id ?? a.id) - at(b.rewrites?.id ?? b.id) || Number(!!a.rewrites) - Number(!!b.rewrites));
}

/**
 * Every example in the library, rendered as the player would see it, with filters. The ones the studio's current answers
 * put in the prompt are tagged "in prompt", a link to that part in the studio.
 */
export default function ExampleViewer() {
  const mounted = useMounted();
  const entries = useMemo(() => catalogue(), []);
  const [onlyPrompt, setOnlyPrompt] = useState<"in" | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [teaching, setTeaching] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  // every model that wrote an example, newest-looking first, then the ones written before the model was recorded
  const models = useMemo(() => {
    const all = [...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES];
    const ids = [...new Set(all.map((e) => e.model).filter((m): m is string => !!m))].sort().reverse();
    const counted = (m: string | undefined) => all.filter((e) => e.model === m).length;
    return [
      ...ids.map((id) => ({ id, label: `${modelLabel(id)} (${counted(id)})` })),
      ...(all.some((e) => !e.model) ? [{ id: NO_MODEL, label: `Not recorded (${counted(undefined)})` }] : []),
    ];
  }, []);

  // every teaching-skills version an example was written to, newest first
  const teachingVersions = useMemo(() => {
    const all = [...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES];
    return [...new Set(all.map((e) => e.docs.teaching))].sort((a, b) => b - a).map((v) => ({ id: `v${v}`, label: `Skills v${v}${v === DOC_VERSIONS.teaching ? " (current)" : ""} (${all.filter((e) => e.docs.teaching === v).length})` }));
  }, []);

  const read = useMemo(() => (mounted ? answersFromText(loadStudio().answersText) : null), [mounted]);
  const answers = read && !read.error ? read.answers : null;
  const inPrompt = useMemo(() => {
    if (!answers) return new Set<string>();
    const s = selectExamples(answers);
    return new Set([...s.exercises.map((e) => e.id), s.plan.id]);
  }, [answers]);
  const library = useMemo(
    () =>
      pairRewrites([...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES]).filter(
        (e) =>
          (!kind || e.kind === kind) && (!area || e.areas.includes(area)) && (!level || e.level === level) &&
          (!showcase || (e.kind === "exercise" && e.showcase === showcase)) && (!onlyPrompt || inPrompt.has(e.id)) &&
          (!teaching || teachingOf(e) === teaching) && (!model || (e.model ?? NO_MODEL) === model),
      ),
    [kind, area, level, showcase, teaching, model, onlyPrompt, inPrompt],
  );

  // every section of every example as it is now, filtered out or not: what the Notes bar checks section notes against and re-pins them to
  const shown = useMemo(() => {
    const sections = exampleSections([...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES].map((e) => ({ id: e.id, json: JSON.stringify(e.kind === "plan" ? e.plan : e.exercise) })), entries);
    return { hashes: hashesOf(sections), repin: (notes: CopyNote[], files?: Record<string, { commit: string; dirty?: boolean }>) => repinSectionNotes(notes, sections, files) };
  }, [entries]);
  useShowSections(shown);

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Answers from the <Link href="/dev/prompt" className="text-sky-300 underline">prompt studio</Link>
        {read?.error ? ` don't parse (${read.error}); showing the skipped-questionnaire prompt.` : answers ? "." : " say the questionnaire was skipped."}
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Filter<"in"> label="Prompt" value={onlyPrompt} onChange={setOnlyPrompt} options={[{ id: "in", label: `In prompt (${inPrompt.size})` }]} />
          <Filter<Kind> label="Kind" value={kind} onChange={setKind} options={[{ id: "exercise", label: "Exercise" }, { id: "plan", label: "Plan" }]} />
          <Filter<Area> label="Area" value={area} onChange={setArea} options={AREAS} />
          <Filter<Level> label="Level" value={level} onChange={setLevel} options={LEVELS} />
          <Filter<Showcase> label="Showcase" value={showcase} onChange={setShowcase} options={[{ id: "blocks", label: "Blocks" }, { id: "pick", label: "Pick" }, { id: "progression", label: "Progression" }]} />
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
                  <Pill tone={KIND_TONE[e.kind]}>{e.kind === "plan" ? "plan example" : "exercise example"}</Pill>
                  <Pill tone={versionTone(e.docs.teaching, DOC_VERSIONS.teaching)} title="The version of the teaching skills it was written to">teaching skills v{e.docs.teaching}</Pill>
                  <Pill tone={versionTone(e.docs.agents, DOC_VERSIONS.agents)} title="The version of AGENTS.md it was written to">AGENTS.md v{e.docs.agents}</Pill>
                  {e.areas.map((a) => <Pill key={a} tone={AREA_TONE[a]}>{labelOf(AREAS, a)}</Pill>)}
                  <Pill tone={LEVEL_TONE[e.level]}>{labelOf(LEVELS, e.level)}</Pill>
                  {e.model ? <Pill tone="indigo" title={e.model}>{modelLabel(e.model)}</Pill> : <Pill tone="slate" title="Written before the model was recorded">model not recorded</Pill>}
                  <Pill tone="sky" title="Last written or rewritten">updated {e.updated}</Pill>
                  {e.rewrites && <Pill tone="lime">rewrites {e.rewrites.id} ↑</Pill>}
                  {inPrompt.has(e.id) && (
                    <Link href={`/dev/prompt#${partAnchor(`example:${e.id}`)}`} title="Open this example's part in the prompt studio" onClick={(ev) => ev.stopPropagation()}>
                      <Pill tone="emerald">in prompt →</Pill>
                    </Link>
                  )}
                </>
              }
              meta={
                <span className="text-xs text-slate-500">
                  {e.kind === "plan" ? `${e.minutes} min/day · ` : e.showcase ? `showcase: ${e.showcase} · ` : ""}{e.concepts.map((c) => conceptById(c)?.label ?? c).join(", ")}
                </span>
              }
              note={e.note}
              changes={e.rewrites?.changes}
              paired={!!e.rewrites && library.some((x) => x.id === e.rewrites!.id)}
              json={JSON.stringify(e.kind === "plan" ? e.plan : e.exercise)}
              entries={entries}
            />
          ))}
          {!library.length && <li className="text-sm text-slate-500">No example matches.</li>}
        </ul>
      </div>
    </div>
  );
}
