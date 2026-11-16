import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import type { DevModel } from "./models";

/** Per prompt part: switched off, or its text replaced. */
export type Overrides = Record<string, { text?: string; off?: boolean }>;

/** The tokens one run used, as the claude CLI reports them. */
export interface TokenUsage { input: number; output: number; cacheRead: number; cacheWrite: number }

/** One run of the prompt (or one reply pasted from another AI), as kept in tools/prompt-history/<id>.json. */
export interface RunRecord {
  id: string;
  at: string;
  mode: "first" | "next";
  model: DevModel | "pasted";
  /** the made-up player it was written for (model/personas.ts), on runs from scripts/compare-models.ts */
  persona?: string;
  answers: unknown;
  overrides: Overrides;
  previousId?: string;
  feedback?: string;
  parts: { id: string; label: string; edited: boolean; off: boolean }[];
  prompt: string;
  reply?: string;
  error?: string;
  durationMs: number;
  costUsd?: number;
  usage?: TokenUsage;
  title?: string;
  warnings?: number;
  /** the versions of the prompt (PROMPT_VERSION) and the writing rules (DOC_VERSIONS) it ran with; absent on runs from before they were kept */
  versions?: RunVersions;
}

/** What a run was written to: the prompt's version, AGENTS.md's and the teaching skills'. */
export interface RunVersions { prompt: number; agents: number; teaching: number }

/** A history row: enough to list a run without its prompt and reply. */
export interface RunSummary {
  id: string;
  at: string;
  mode: RunRecord["mode"];
  model: RunRecord["model"];
  ok: boolean;
  /** why it failed, cut to 120 characters */
  error?: string;
  title?: string;
  warnings?: number;
  durationMs: number;
  costUsd?: number;
  usage?: TokenUsage;
  persona?: string;
  chars: number;
  edited: string[];
}

/** The prompt and what it was built from. */
export type RunInput = Pick<RunRecord, "mode" | "answers" | "overrides" | "parts" | "previousId" | "feedback" | "prompt">;

export const RUN_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]{4}$/;

/** A file-safe id that sorts by time: "2026-10-31T14-05-09-a1b2". */
export const newRunId = (at: Date, rand: string = Math.random().toString(36).slice(2, 6).padEnd(4, "0")): string =>
  `${at.toISOString().slice(0, 19).replace(/:/g, "-")}-${rand}`;

export function summaryOf(r: RunRecord): RunSummary {
  return {
    id: r.id, at: r.at, mode: r.mode, model: r.model, ok: !r.error,
    ...(r.error ? { error: r.error.slice(0, 120) } : {}),
    ...(r.title !== undefined ? { title: r.title } : {}),
    ...(r.warnings !== undefined ? { warnings: r.warnings } : {}),
    durationMs: r.durationMs,
    ...(r.costUsd !== undefined ? { costUsd: r.costUsd } : {}),
    ...(r.usage ? { usage: r.usage } : {}),
    ...(r.persona ? { persona: r.persona } : {}),
    chars: r.prompt.length,
    edited: r.parts.filter((p) => p.edited).map((p) => p.id),
  };
}

/** The plan's title and warning count when the reply parses as a plan; nothing when it doesn't. */
export function describeReply(reply: string | undefined, entries: CatalogueEntry[]): { title?: string; warnings?: number } {
  if (!reply) return {};
  const r = parsePlanConfig(reply, entries);
  return r.ok ? { title: r.config.title, warnings: r.warnings.length } : {};
}

const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

type Read<T> = { ok: true; value: T } | { ok: false; error: string };

/** The prompt and its inputs from a request body (a run, or a pasted reply); only the prompt is required. */
export function readRunInput(body: unknown): Read<RunInput> {
  const b = obj(body);
  if (typeof b.prompt !== "string" || !b.prompt.trim()) return { ok: false, error: "No prompt." };
  return {
    ok: true,
    value: {
      prompt: b.prompt,
      mode: b.mode === "next" ? "next" : "first",
      answers: b.answers ?? null,
      overrides: obj(b.overrides) as Overrides,
      parts: Array.isArray(b.parts) ? (b.parts as RunRecord["parts"]) : [],
      ...(typeof b.previousId === "string" ? { previousId: b.previousId } : {}),
      ...(typeof b.feedback === "string" ? { feedback: b.feedback } : {}),
    },
  };
}
