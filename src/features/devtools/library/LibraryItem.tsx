"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { SEED_BLOCKS, SEED_PLANS, seedExercise, seedPlan } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import ExamplePreview from "../prompt/ExamplePreview";
import { parsePreview } from "../model/preview";
import { exerciseSteps, planSteps, type ConceptAt } from "../model/exampleSteps";
import { exampleSections, hashesOf, repinSectionNotes } from "../model/comments";
import type { CopyNote } from "../model/copyNotes";
import { useShowSections } from "../copy/store";
import { CommentCount, CommentsFor } from "./Comments";
import { useMounted } from "../prompt/storage";
import type { DrawnItem } from "./item";

/** Every seed plan and block as section comments are kept: by the seed file's id. */
const SEED_JSON: { id: string; json: string }[] = [
  ...SEED_BLOCKS.map((f) => ({ id: f.id, json: JSON.stringify(seedExercise(f)) })),
  ...SEED_PLANS.map((f) => ({ id: f.id, json: JSON.stringify(seedPlan(f)) })),
];

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

const pathHref = (concept: string) => `/admin/content/path?concept=${concept}`;

/** A concept as a link to its box on /admin/content/path, with what was read for it after. */
function ConceptLink({ concept, label, children }: { concept: string; label: string; children?: ReactNode }) {
  return (
    <Link href={pathHref(concept)} title="Open this concept on /admin/content/path" className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800/60 px-1.5 text-[11px] text-slate-200 hover:border-sky-500/60">
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
 * The concepts the example's exercises are tagged with, each with the step its tools say (`stepOf`), linked to /admin/content/path.
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

/** One colour family per kind of tag, so a row of pills reads at a glance: border, fill and text together. */
const TONE = {
  fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  lime: "border-lime-500/40 bg-lime-500/10 text-lime-200",
  amber: "border-amber-500/30 bg-amber-500/5 text-amber-300/80",
  indigo: "border-indigo-400/50 bg-indigo-500/15 text-indigo-100",
  slate: "border-slate-600 bg-slate-800/40 text-slate-400",
} as const;
type Tone = keyof typeof TONE;

const KIND_TONE: Record<DrawnItem["kind"], Tone> = { plan: "fuchsia", block: "rose" };

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

/** Hands the Notes bar every seed item's sections as they are now, opened or not, so it can count and re-pin section notes. */
export function SeedSections() {
  const shown = useMemo(() => {
    const sections = exampleSections(SEED_JSON, catalogue());
    return { hashes: hashesOf(sections), repin: (notes: CopyNote[], files?: Record<string, { commit: string; dirty?: boolean }>) => repinSectionNotes(notes, sections, files) };
  }, []);
  useShowSections(shown);
  return null;
}

/** A version against the current one: `v—` when it was not recorded, warm when it is older. */
function VersionPill({ name, v, current, title }: { name: string; v: number | null; current: number; title: string }) {
  return <Pill tone={v === current ? "lime" : v === null ? "slate" : "amber"} title={`${title}; now v${current}`}>{name} v{v ?? "—"}{v !== current ? ` → v${current}` : ""}</Pill>;
}

/** One plan or block drawn as the player sees it, with the versions it was written to and, for a seed file, its section comments. */
export default function LibraryItem({ item }: { item: DrawnItem }) {
  const mounted = useMounted();
  const entries = useMemo(() => catalogue(), []);
  const tools = useMemo(() => [...toolsUsed(JSON.parse(item.json))], [item.json]);
  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  const preview = <ExamplePreview json={item.json} entries={entries} videos={item.kind === "block"} blockId={item.seedId} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
      <div className="flex flex-col gap-1 border-b border-slate-700 bg-slate-800/50 px-4 py-2.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-sky-200">{item.seedId ?? item.id}</span>
          <Pill tone={KIND_TONE[item.kind]}>{item.seedId ? `seed ${item.kind}` : item.kind}</Pill>
          {item.choiceId && <Pill tone="slate" title="The choice drawn">choice {item.choiceId.slice(item.choiceId.indexOf("/") + 1)}</Pill>}
          <VersionPill name="teaching" v={item.versions.teaching} current={DOC_VERSIONS.teaching} title="The teaching skills' version it was written to" />
          <VersionPill name="agents" v={item.versions.agents} current={DOC_VERSIONS.agents} title="The AGENTS.md version it was written to" />
          <VersionPill name="prompt" v={item.versions.prompt} current={PROMPT_VERSION} title="The plan prompt's version it was written to" />
          {item.model ? <Pill tone="indigo" title={item.model}>{modelLabel(item.model)}</Pill> : <Pill tone="slate">model not recorded</Pill>}
          {item.seedId && <CommentCount example={item.seedId} />}
        </span>
        {item.kind === "plan" && item.minutes !== undefined && <span className="text-xs text-slate-500">{item.minutes} min/day</span>}
        {item.showcase && <span className="text-xs text-slate-500">Showcase ({item.showcase}): {item.feature}</span>}
        <StepsRow json={item.json} entries={entries} />
        {item.note && <span className="text-xs text-slate-400">{item.note}</span>}
        {!item.seedId && <span className="text-xs text-slate-500">No seed file: drawn from the database, without comments.</span>}
        {tools.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {tools.map(([t, n]) => <span key={t} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 font-mono text-[11px] text-amber-200">{t}{n > 1 ? <span className="text-amber-200/60"> ×{n}</span> : null}</span>)}
          </span>
        )}
      </div>
      <div className="bg-slate-950/30 p-4">{item.seedId ? <CommentsFor example={item.seedId}>{preview}</CommentsFor> : preview}</div>
    </div>
  );
}
