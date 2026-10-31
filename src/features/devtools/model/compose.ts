import { migrateAnswers } from "@/features/plan/model/answers";
import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import type { PromptPart } from "@/features/plan/model/prompt";
import { DEFAULT_ANSWERS } from "@/features/plan/model/questions";
import type { PlanAnswers, StoredPlan } from "@/features/plan/model/types";
import type { Overrides, RunRecord } from "./history";
import { isDevModel, type DevModel } from "./models";

/** The prompt as sent: its text, which parts were edited or switched off, and the part list kept with a run. */
export interface Composed {
  text: string;
  edited: string[];
  off: string[];
  parts: RunRecord["parts"];
}

/** The parts with the studio's overrides applied: off parts dropped, edited ones replaced. Overrides for parts that are gone, or equal to the text, do nothing. */
export function composePrompt(parts: PromptPart[], o: Overrides): Composed {
  const list = parts.map((p) => {
    const ov = o[p.id];
    const edited = ov?.text !== undefined && ov.text !== p.text;
    return { id: p.id, label: p.label, edited, off: !!ov?.off, text: edited ? ov!.text! : p.text };
  });
  return {
    text: list.filter((p) => !p.off).map((p) => p.text).join("\n"),
    edited: list.filter((p) => p.edited).map((p) => p.id),
    off: list.filter((p) => p.off).map((p) => p.id),
    parts: list.map(({ id, label, edited, off }) => ({ id, label, edited, off })),
  };
}

/** The answers JSON the studio edits; "null" stands for a skipped questionnaire. */
export function answersFromText(text: string): { answers: PlanAnswers | null; error?: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { answers: null, error: (e as Error).message };
  }
  return { answers: raw === null ? null : migrateAnswers(raw) };
}

/** A past run as "last week" for the next-week prompt, with the ticks made on its preview; null when its reply isn't a plan. */
export function storedPlanFrom(r: RunRecord, done: Record<string, boolean>, feedback: string, entries: CatalogueEntry[]): StoredPlan | null {
  const parsed = r.reply ? parsePlanConfig(r.reply, entries) : null;
  if (!parsed?.ok) return null;
  const ticks = Object.fromEntries(Object.entries(done).filter(([, v]) => v).map(([k]) => [k, true as const]));
  return { id: r.id, config: parsed.config, startedOn: r.at.slice(0, 10), done: ticks, ...(feedback.trim() ? { feedback } : {}) };
}

/** What the studio keeps between visits. */
export interface StudioState {
  answersText: string;
  mode: "first" | "next";
  overrides: Overrides;
  model: DevModel;
  previousId?: string;
  feedback: string;
}

export const STUDIO_KEY = "musickit.dev.prompt";
export const DEFAULT_STUDIO: StudioState = { answersText: JSON.stringify(DEFAULT_ANSWERS, null, 2), mode: "first", overrides: {}, model: "sonnet", feedback: "" };

/** Saved studio state, made safe: anything missing or broken falls back to the default. */
export function readStudio(raw: unknown): StudioState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof StudioState, unknown>>;
  const o = s.overrides && typeof s.overrides === "object" && !Array.isArray(s.overrides) ? (s.overrides as Overrides) : DEFAULT_STUDIO.overrides;
  return {
    answersText: typeof s.answersText === "string" ? s.answersText : DEFAULT_STUDIO.answersText,
    mode: s.mode === "next" ? "next" : "first",
    overrides: o,
    model: isDevModel(s.model) ? s.model : DEFAULT_STUDIO.model,
    ...(typeof s.previousId === "string" ? { previousId: s.previousId } : {}),
    feedback: typeof s.feedback === "string" ? s.feedback : "",
  };
}
