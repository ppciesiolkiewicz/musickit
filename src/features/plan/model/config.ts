import { fitBlocks, blocksOf } from "./blocks";
import { mixesSingAndPlay, tempoWithoutMetronome } from "./checks";
import { checkLink, type CatalogueEntry } from "./catalogue";
import { choiceWarnings } from "./stepChoice";
import { MAX_CELLS, MAX_TAGS, askedTags, cellsOf, exerciseLevelArea, exerciseTags, parseCellDiag, pickWasInexact, resolveChordPlacement, toolsOf, type Cell } from "./tools";
import { PLAN_DAYS, type PlanConfig, type PlanDay, type PlanExercise } from "./types";
import { conceptById } from "./concepts";
import { topicById } from "../intake/topics";

/** The longest progress summary kept from a reply. */
export const MAX_PROGRESS = 4000;
const MAX_CONCEPTS = 4;
const MAX_TOOLS = 6, MAX_EXERCISES = 8;
/** What the prompt asks for a day: 2 to 5 exercises. */
const MIN_DAY = 2, MAX_DAY = 5;

export type ParseResult = { ok: true; config: PlanConfig; warnings: string[] } | { ok: false; error: string };

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The most links a slot keeps. */
export const SLOT_MAX = 3;

/** Cells from the AI's list; what can't be shown (a tool for an unknown scale) is left out with a warning saying why, and what was cut or defaulted is warned. Sections' cells count towards the cap. */
function parseCells(raw: unknown[], where: string, warnings: string[]): Cell[] {
  const out = raw.map((r) => parseCellDiag(r));
  for (const p of out) {
    for (const n of p.notes) warnings.push(`${where}: ${n}`);
    if (p.dropped) warnings.push(`${where}: left out ${p.dropped}.`);
  }
  let kept = out.flatMap((p) => (p.cell ? [p.cell] : []));
  let count = 0;
  const total = cellsOf(kept).length;
  if (total > MAX_CELLS) {
    warnings.push(`${where}: kept the first ${MAX_CELLS} of ${total} cells.`);
    kept = kept.flatMap((c): Cell[] => {
      if (count >= MAX_CELLS) return [];
      if (c.type !== "section") { count++; return [c]; }
      const cells = c.cells.slice(0, MAX_CELLS - count);
      count += cells.length;
      return cells.length ? [{ ...c, cells }] : [];
    });
  }
  for (const t of toolsOf(kept)) if (pickWasInexact(t)) warnings.push(`${where}: no tune matched the pick exactly; used ${"run" in t ? `run ${t.run}` : "tune" in t ? `tune ${t.tune}` : "one"}.`);
  return kept;
}

/** The exercise's link slots, each link checked against the catalogue: an unknown one is dropped with a warning; each slot keeps 3, and a link in both stays in Learn before. */
function parseSlots(e: Record<string, unknown>, entries: CatalogueEntry[], where: string, warnings: string[]): Pick<PlanExercise, "learnBefore" | "exploreMore"> {
  const check = (raw: unknown) => [...new Set((Array.isArray(raw) ? raw : []).filter((h): h is string => typeof h === "string").flatMap((h) => {
    const href = checkLink(h, entries);
    if (!href) warnings.push(`${where}: dropped the link "${h}" (not an attunr page).`);
    return href ? [href] : [];
  }))];
  const learnBefore = check(e.learnBefore).slice(0, SLOT_MAX);
  const exploreMore = check(e.exploreMore).filter((h) => !learnBefore.includes(h)).slice(0, SLOT_MAX);
  return { ...(learnBefore.length ? { learnBefore } : {}), ...(exploreMore.length ? { exploreMore } : {}) };
}

/** The JSON object in what the player pasted: the AI's whole reply is fine (prose, a ```json fence). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No plan found. Paste the JSON your AI replied with.");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * An exercise's topic and concepts as the AI tagged them. A topic that is unknown, or belongs to another area than the
 * exercise's, is dropped with a warning; concepts are kept when they are known and of that topic (at most 4), the rest
 * named in a warning.
 */
function topicTags(e: Record<string, unknown>, area: PlanExercise["area"], where: string, warnings: string[]): Pick<PlanExercise, "topic" | "concepts"> {
  const out: Pick<PlanExercise, "topic" | "concepts"> = {};
  const id = str(e.topic, 60);
  const topic = id ? topicById(id) : undefined;
  if (id && !topic) warnings.push(`${where}: unknown topic "${id}".`);
  else if (topic && area && topic.area !== area) warnings.push(`${where}: topic "${id}" is not a ${area} topic.`);
  else if (topic) out.topic = topic.id;
  if (!Array.isArray(e.concepts)) return out;
  const ids = [...new Set(e.concepts.filter((c): c is string => typeof c === "string"))];
  const fits = (c: string) => !!conceptById(c) && (!out.topic || conceptById(c)!.topic === out.topic);
  const kept = ids.filter(fits).slice(0, MAX_CONCEPTS);
  const dropped = ids.filter((c) => !fits(c));
  if (dropped.length) warnings.push(`${where}: left out concepts that are unknown or of another topic: ${dropped.join(", ")}.`);
  if (kept.length) out.concepts = kept;
  return out;
}

/**
 * A pasted plan, checked and tidied: seven days, each with at least one exercise, minutes 1..120 (block minutes scaled to fit), links only to attunr pages
 * (an unknown link is dropped with a warning, the exercise kept). Extra days are cut, missing ones are an error.
 */
export function parsePlanConfig(text: string, entries: CatalogueEntry[]): ParseResult {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    return { ok: false, error: e instanceof SyntaxError ? "That isn't valid JSON. Copy the AI's whole code block again." : (e as Error).message };
  }
  const obj = raw as { title?: unknown; summary?: unknown; progress?: unknown; days?: unknown };
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.days)) return { ok: false, error: "The plan needs a \"days\" list." };
  if (obj.days.length < PLAN_DAYS) return { ok: false, error: `The plan has ${obj.days.length} days; it needs ${PLAN_DAYS}.` };
  const warnings: string[] = [];
  if (obj.days.length > PLAN_DAYS) warnings.push(`Kept the first ${PLAN_DAYS} of ${obj.days.length} days.`);
  const days: PlanDay[] = [];
  for (let d = 0; d < PLAN_DAYS; d++) {
    const day = obj.days[d] as { theme?: unknown; exercises?: unknown };
    const list = Array.isArray(day?.exercises) ? day.exercises : [];
    if (list.length > MAX_EXERCISES) warnings.push(`Day ${d + 1}: kept the first ${MAX_EXERCISES} of ${list.length} exercises.`);
    const exercises: PlanExercise[] = list.slice(0, MAX_EXERCISES).flatMap((x, i) => {
      const e = x as Record<string, unknown>;
      const title = str(e?.title, 120);
      if (!title) return [];
      const minutes = Math.round(Number(e.minutes));
      const ex: PlanExercise = { title, minutes: Number.isFinite(minutes) ? Math.min(120, Math.max(1, minutes)) : 10 };
      const focus = str(e.focus, 120);
      if (focus) ex.focus = focus;
      const where = `Day ${d + 1}, exercise ${i + 1}`;
      const sections = resolveChordPlacement(Array.isArray(e.cells) ? parseCells(e.cells, where, warnings) : []);
      if (!sections.length) {
        warnings.push(Array.isArray(e.sections) && !Array.isArray(e.cells) ? `${where}: has no cells (did you write "sections"?).` : `${where}: no instructions.`);
        sections.push({ type: "text", text: title });
      }
      const fit = fitBlocks(sections, ex.minutes);
      if (fit.changed) warnings.push(`${where}: block minutes didn't add up to ${ex.minutes}; scaled them.`);
      if (ex.minutes > 5 && blocksOf(fit.sections).length < 2) warnings.push(`${where}: over 5 minutes in one block; split it.`);
      if (mixesSingAndPlay(fit.sections)) warnings.push(`${where}: asks to both sing and play; keep it to one.`);
      if (tempoWithoutMetronome(fit.sections)) warnings.push(`${where}: asks for a tempo but shows no metronome; add one.`);
      for (const w of choiceWarnings(fit.sections)) warnings.push(`${where}: ${w}`);
      ex.cells = fit.sections;
      Object.assign(ex, exerciseLevelArea(e));
      const tags = exerciseTags(e.tags, sections);
      if (tags.length) ex.tags = tags;
      const asked = askedTags(e.tags);
      if (asked.known.length > MAX_TAGS) warnings.push(`${where}: kept the first ${MAX_TAGS} of ${asked.known.length} kind tags (${asked.known.slice(MAX_TAGS).join(", ")} dropped).`);
      if (asked.unknown.length) warnings.push(`${where}: dropped unknown kind tags: ${asked.unknown.join(", ")}.`);
      Object.assign(ex, topicTags(e, ex.area, where, warnings));
      const untagged = [!ex.level && "level", !ex.area && "area", !tags.length && "kind", !ex.topic && "topic"].filter(Boolean);
      if (untagged.length) warnings.push(`${where}: no ${untagged.join(", ")} tag.`);
      const why = str(e.why, 300);
      if (why) ex.why = why;
      Object.assign(ex, parseSlots(e, entries, where, warnings));
      const tools = toolsOf(fit.sections).length;
      if (tools > MAX_TOOLS) warnings.push(`${where}: ${tools} tools; keep it to ${MAX_TOOLS}.`);
      if (!ex.learnBefore?.length) warnings.push(`${where}: no learnBefore link; add an attunr page to learn first.`);
      return [ex];
    });
    if (!exercises.length) return { ok: false, error: `Day ${d + 1} has no exercises.` };
    if (exercises.length < MIN_DAY || exercises.length > MAX_DAY) warnings.push(`Day ${d + 1}: ${exercises.length} exercise${exercises.length > 1 ? "s" : ""}; use ${MIN_DAY} to ${MAX_DAY}.`);
    days.push({ theme: str(day.theme, 80) || `Day ${d + 1}`, exercises });
  }
  const summary = str(obj.summary, 400);
  const progress = str(obj.progress, MAX_PROGRESS);
  if (!progress) warnings.push("No progress summary in the reply.");
  return { ok: true, config: { title: str(obj.title, 80) || "My practice week", ...(summary ? { summary } : {}), ...(progress ? { progress } : {}), days }, warnings };
}
