import { VOICES, type Voice } from "@/features/theory/singing";
import { AREAS, type Area } from "../model/concepts";
import type { Level } from "../model/types";
import { TOPICS, topicById, topicsFor, type Rung } from "./topics";

/** What the player told the first questionnaire. Feeds the prompt; never sent anywhere by the app itself. */
export interface PlanAnswers {
  /** the areas they practise, in AREAS order, at least one */
  areas: Area[];
  /** topic id (topics.ts) to the line they picked; a topic left out was not answered */
  topics: Record<string, Rung>;
  voice?: { type?: Voice; range?: { low: number; high: number } };
  /** minutes a day they can practise */
  minutes: number;
  /** styles they love, free text ("blues, indie") */
  styles: string;
  /** anything else for the AI */
  notes: string;
}

export const MINUTES = [10, 15, 20, 30, 45, 60];

export const DEFAULT_ANSWERS: PlanAnswers = { areas: ["guitar"], topics: {}, minutes: 20, styles: "", notes: "" };

const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isRung = (x: unknown): x is Rung => x === 0 || x === 1 || x === 2 || x === 3;
/** The areas among `picked`, in screen order. */
const inOrder = (picked: unknown[]): Area[] => AREAS.map((a) => a.id).filter((id) => picked.includes(id));

/** Areas from the shapes before `areas`: per-area `levels`, or older still a list of instruments (piano is dropped, guitar stands in, theory always). */
function oldAreas(raw: Record<string, unknown>): Area[] {
  if (isRecord(raw.levels)) return inOrder(Object.keys(raw.levels));
  const list = Array.isArray(raw.instruments) ? raw.instruments : typeof raw.instrument === "string" ? [raw.instrument] : null;
  if (!list) return [];
  const played = inOrder(list).filter((a) => a !== "theory");
  return inOrder([...(played.length ? played : ["guitar"]), "theory"]);
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
 * Stored or saved answers in today's shape. Older shapes (per-area levels with concept stars and a focus, or a list of
 * instruments and one level) keep their areas, voice, minutes, styles and notes; their stars and focus are dropped and the
 * topics start empty. Unknown topics, bad lines, unknown areas and a bad voice are dropped; anything unreadable gives the defaults.
 */
export function migrateAnswers(raw: unknown): PlanAnswers {
  if (!isRecord(raw)) return { ...DEFAULT_ANSWERS, areas: [...DEFAULT_ANSWERS.areas], topics: {} };
  let areas = Array.isArray(raw.areas) ? inOrder(raw.areas) : oldAreas(raw);
  if (!areas.length) areas = [...DEFAULT_ANSWERS.areas];
  const topics: PlanAnswers["topics"] = {};
  if (isRecord(raw.topics)) for (const [id, v] of Object.entries(raw.topics)) if (topicById(id) && isRung(v)) topics[id] = v;
  const voice = voiceOf(raw.voice);
  return {
    areas,
    topics,
    ...(voice ? { voice } : {}),
    minutes: typeof raw.minutes === "number" && raw.minutes > 0 ? raw.minutes : DEFAULT_ANSWERS.minutes,
    styles: typeof raw.styles === "string" ? raw.styles : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

/**
 * One level for an area, for code that needs one (which example plan to show, how to pitch exercises): the mean of the
 * lines picked in that area's topics, rounded. Nothing answered there gives "beginner".
 */
export function levelOf(a: Pick<PlanAnswers, "topics">, area: Area): Level {
  const rungs = topicsFor(area).flatMap((t) => a.topics[t.id] ?? []);
  if (!rungs.length) return "beginner";
  return LEVEL_ORDER[Math.round(rungs.reduce<number>((s, r) => s + r, 0) / rungs.length)];
}

/** The chosen areas where no topic is answered yet (answers kept from before the topics: they are asked once). */
export const areasMissingTopics = (a: Pick<PlanAnswers, "areas" | "topics">): Area[] =>
  a.areas.filter((area) => !TOPICS.some((t) => t.area === area && a.topics[t.id] !== undefined));
