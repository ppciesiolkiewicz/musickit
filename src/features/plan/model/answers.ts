import { VOICES, type Voice } from "@/features/theory/singing";
import { conceptById, type Area } from "./concepts";
import { DEFAULT_ANSWERS, LEVELS } from "./questions";
import type { Level, PlanAnswers, Rating } from "./types";

const AREA_IDS: Area[] = ["guitar", "voice", "theory"];
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isLevel = (x: unknown): x is Level => LEVELS.some((l) => l.id === x);
const isRating = (x: unknown): x is Rating => x === 1 || x === 2 || x === 3 || x === 4 || x === 5;

/** Levels from the old shape: one level and a list of instruments. Piano is dropped; guitar stands in when neither guitar nor voice is left. */
function oldLevels(a: Record<string, unknown>): PlanAnswers["levels"] {
  const level = isLevel(a.level) ? a.level : "beginner";
  const list = Array.isArray(a.instruments) ? a.instruments : typeof a.instrument === "string" ? [a.instrument] : [];
  const levels: PlanAnswers["levels"] = {};
  if (list.includes("guitar")) levels.guitar = level;
  if (list.includes("voice")) levels.voice = level;
  if (!levels.guitar && !levels.voice) levels.guitar = level;
  levels.theory = level;
  return levels;
}

function newLevels(raw: unknown): PlanAnswers["levels"] {
  const levels: PlanAnswers["levels"] = {};
  if (isRecord(raw)) for (const area of AREA_IDS) if (isLevel(raw[area])) levels[area] = raw[area];
  return levels;
}

function voiceOf(raw: unknown): PlanAnswers["voice"] {
  if (!isRecord(raw)) return undefined;
  const voice: NonNullable<PlanAnswers["voice"]> = {};
  if (typeof raw.type === "string" && Object.hasOwn(VOICES, raw.type)) voice.type = raw.type as Voice;
  const r = raw.range;
  if (isRecord(r) && typeof r.low === "number" && typeof r.high === "number" && Number.isFinite(r.low) && Number.isFinite(r.high) && r.low < r.high) {
    voice.range = { low: r.low, high: r.high };
  }
  return voice.type || voice.range ? voice : undefined;
}

/**
 * Stored or saved answers in today's shape. The old shape (`instruments` or `instrument`, one `level`, goals, struggles)
 * becomes per-area levels; unknown concepts, bad ratings and a bad voice are dropped; anything unreadable gives the defaults.
 */
export function migrateAnswers(raw: unknown): PlanAnswers {
  if (!isRecord(raw)) return { ...DEFAULT_ANSWERS, levels: { ...DEFAULT_ANSWERS.levels }, ratings: {}, focus: [] };
  let levels = "levels" in raw ? newLevels(raw.levels) : oldLevels(raw);
  if (Object.keys(levels).length === 0) levels = { ...DEFAULT_ANSWERS.levels };
  const ratings: PlanAnswers["ratings"] = {};
  if (isRecord(raw.ratings)) for (const [id, v] of Object.entries(raw.ratings)) if (conceptById(id) && isRating(v)) ratings[id] = v;
  const focus = Array.isArray(raw.focus) ? raw.focus.filter((id): id is string => typeof id === "string" && !!conceptById(id)).slice(0, 3) : [];
  const voice = voiceOf(raw.voice);
  return {
    levels,
    ratings,
    ...(voice ? { voice } : {}),
    focus,
    minutes: typeof raw.minutes === "number" && raw.minutes > 0 ? raw.minutes : DEFAULT_ANSWERS.minutes,
    styles: typeof raw.styles === "string" ? raw.styles : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}
