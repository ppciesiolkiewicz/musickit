import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { isDevModel, type DevModel } from "./models";

/** Per prompt part: switched off, or its text replaced. */
export type Overrides = Record<string, { text?: string; off?: boolean }>;
export type Effort = "low" | "medium" | "high";
const EFFORTS: Effort[] = ["low", "medium", "high"];

/** One run of the prompt (or one reply pasted from another AI), as kept in tools/prompt-history/<id>.json. */
export interface RunRecord {
  id: string;
  at: string;
  mode: "first" | "next";
  model: DevModel | "pasted";
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
  title?: string;
  warnings?: number;
}

/** A history row: enough to list a run without its prompt and reply. */
export interface RunSummary {
  id: string;
  at: string;
  mode: RunRecord["mode"];
  model: RunRecord["model"];
  ok: boolean;
  title?: string;
  warnings?: number;
  durationMs: number;
  costUsd?: number;
  chars: number;
  edited: string[];
}

/** The prompt and what it was built from. */
export type RunInput = Pick<RunRecord, "mode" | "answers" | "overrides" | "parts" | "previousId" | "feedback" | "prompt">;
/** A run request: the input and how to run it. */
export type RunRequest = RunInput & { model: DevModel; effort?: Effort };

export const RUN_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]{4}$/;

/** A file-safe id that sorts by time: "2026-10-31T14-05-09-a1b2". */
export const newRunId = (at: Date, rand: string = Math.random().toString(36).slice(2, 6).padEnd(4, "0")): string =>
  `${at.toISOString().slice(0, 19).replace(/:/g, "-")}-${rand}`;

export function summaryOf(r: RunRecord): RunSummary {
  return {
    id: r.id, at: r.at, mode: r.mode, model: r.model, ok: !r.error,
    ...(r.title !== undefined ? { title: r.title } : {}),
    ...(r.warnings !== undefined ? { warnings: r.warnings } : {}),
    durationMs: r.durationMs,
    ...(r.costUsd !== undefined ? { costUsd: r.costUsd } : {}),
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

/** A run request body, checked: a prompt and a known model are required, the rest falls back to defaults. */
export function readRunRequest(body: unknown): Read<RunRequest> {
  const input = readRunInput(body);
  if (!input.ok) return input;
  const b = obj(body);
  if (!isDevModel(b.model)) return { ok: false, error: "Unknown model." };
  return { ok: true, value: { ...input.value, model: b.model, ...(EFFORTS.includes(b.effort as Effort) ? { effort: b.effort as Effort } : {}) } };
}

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
