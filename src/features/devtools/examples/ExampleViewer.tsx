"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Badge, Chip } from "@/components/ui";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
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
    <li className={`rounded-xl border bg-slate-900/40 ${paired ? "ml-6 border-lime-500/30" : "border-slate-800"}`}>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer flex-col gap-1 px-3 py-2">
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
        {open && <div className="border-t border-slate-800 p-3"><CommentsFor example={title}><ExamplePreview json={json} entries={entries} /></CommentsFor></div>}
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

type Style = "new" | "old";
const styleOf = (e: { style?: "new" }): Style => e.style ?? "old";
/** New-style examples stand out; old ones are marked in a muted warm tone so they read as the ones to rewrite. */
const STYLE_TONE: Record<Style, string> = { new: "text-lime-300", old: "text-amber-400/70" };

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
  const [style, setStyle] = useState<Style | null>(null);

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
          (!style || styleOf(e) === style),
      ),
    [kind, area, level, showcase, style, onlyPrompt, inPrompt],
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
          <Filter<Style> label="Style" value={style} onChange={setStyle} options={[{ id: "new", label: "New teaching style" }, { id: "old", label: "Old style" }]} />
        </div>
        <ul className="flex flex-col gap-2">
          {library.map((e) => (
            <ExampleCard
              key={e.id}
              title={e.id}
              badge={
                <>
                  <Badge className={e.kind === "plan" ? "text-fuchsia-300" : "text-rose-300"}>{e.kind === "plan" ? "plan example" : "exercise example"}</Badge>
                  <Badge className={STYLE_TONE[styleOf(e)]}>{styleOf(e) === "new" ? "new teaching style" : "old style"}</Badge>
                  {e.rewrites && <Badge className="text-lime-200/70">rewrites {e.rewrites.id} ↑</Badge>}
                  {inPrompt.has(e.id) && (
                    <Link href={`/dev/prompt#${partAnchor(`example:${e.id}`)}`} title="Open this example's part in the prompt studio" onClick={(ev) => ev.stopPropagation()}>
                      <Badge className="text-emerald-300 hover:text-emerald-200">in prompt →</Badge>
                    </Link>
                  )}
                </>
              }
              meta={
                <span className="text-xs text-slate-500">
                  {e.kind === "plan" ? `${e.minutes} min/day · ` : e.showcase ? `showcase: ${e.showcase} · ` : ""}{e.areas.map((a) => labelOf(AREAS, a)).join(" + ")} · {labelOf(LEVELS, e.level)} · {e.concepts.map((c) => conceptById(c)?.label ?? c).join(", ")}
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
