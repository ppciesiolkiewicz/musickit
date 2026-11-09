import { fitBlocks, blocksOf } from "./blocks";
import { mixesSingAndPlay, tempoWithoutMetronome } from "./checks";
import { checkLink, type CatalogueEntry } from "./catalogue";
import { linkSlots } from "./migrate";
import { keyWarnings } from "./transpose";
import { exerciseLevelArea, exerciseTags, legacySections, parseSection, parseTool, pickWasInexact, resolveChordPlacement, type Section } from "./tools";
import { PLAN_DAYS, type PlanConfig, type PlanDay, type PlanExercise } from "./types";
import { conceptById } from "./concepts";
import { topicById } from "../intake/topics";

/** The longest progress summary kept from a reply. */
export const MAX_PROGRESS = 4000;
const MAX_CONCEPTS = 4;

export type ParseResult = { ok: true; config: PlanConfig; warnings: string[] } | { ok: false; error: string };

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Sections from the AI's list; what can't be shown (a tool for an unknown scale) is left out with a warning. An old `link` section is a link (`parseSlots`). */
function parseSections(raw: unknown[], where: string, warnings: string[]): Section[] {
  const out = raw.filter((r) => (r as { type?: unknown })?.type !== "link").slice(0, 24).map((r) => parseSection(r));
  const dropped = out.filter((s) => !s).length;
  if (dropped) warnings.push(`${where}: left out ${dropped} section${dropped > 1 ? "s" : ""} it couldn't show.`);
  const kept = out.filter((s): s is Section => s !== null);
  for (const s of kept) if (s.type === "tool" && pickWasInexact(s.tool)) warnings.push(`${where}: no tune matched the pick exactly; used ${"run" in s.tool ? `run ${s.tool.run}` : "tune" in s.tool ? `tune ${s.tool.tune}` : "one"}.`);
  return kept;
}

/** The exercise's link slots, each link checked against the catalogue: an unknown one is dropped with a warning. */
function parseSlots(e: Record<string, unknown>, entries: CatalogueEntry[], where: string, warnings: string[]): Pick<PlanExercise, "learnBefore" | "exploreMore"> {
  const check = (hrefs: string[]) => [...new Set(hrefs.flatMap((h) => {
    const href = checkLink(h, entries);
    if (!href) warnings.push(`${where}: dropped the link "${h}" (not an attunr page).`);
    return href ? [href] : [];
  }))];
  const raw = linkSlots({ ...e, tools: e.tools ?? [] }); // a pasted old-shape link is a link, never a tool (parseLegacy)
  const learnBefore = check(raw.learnBefore);
  const exploreMore = check(raw.exploreMore).filter((h) => !learnBefore.includes(h));
  return { ...(learnBefore.length ? { learnBefore } : {}), ...(exploreMore.length ? { exploreMore } : {}) };
}

/** An exercise in the earlier shape (how / steps / tools / link), as sections; its link, unless it stands for a tool, is in `parseSlots`. */
function parseLegacy(e: Record<string, unknown>, entries: CatalogueEntry[], where: string, warnings: string[]): Section[] {
  const steps = Array.isArray(e.steps) ? e.steps.map((s) => str(s, 240)).filter(Boolean).slice(0, 8) : [];
  const rawTools = Array.isArray(e.tools) ? e.tools.slice(0, 6) : [];
  const tools = rawTools.flatMap((t) => {
    const p = parseTool(t);
    const step = Number((t as { step?: unknown })?.step);
    return p ? [Number.isInteger(step) && step >= 1 && step <= 8 ? { ...p, step } : p] : [];
  });
  if (tools.length < rawTools.length) warnings.push(`${where}: left out a tool it couldn't show.`);
  return legacySections({ how: str(e.how), steps, tools, link: checkLink(e.link, entries) });
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
    const exercises: PlanExercise[] = list.slice(0, 8).flatMap((x, i) => {
      const e = x as Record<string, unknown>;
      const title = str(e?.title, 120);
      if (!title) return [];
      const minutes = Math.round(Number(e.minutes));
      const ex: PlanExercise = { title, minutes: Number.isFinite(minutes) ? Math.min(120, Math.max(1, minutes)) : 10 };
      const focus = str(e.focus, 120);
      if (focus) ex.focus = focus;
      const where = `Day ${d + 1}, exercise ${i + 1}`;
      const sections = resolveChordPlacement(Array.isArray(e.sections) ? parseSections(e.sections, where, warnings) : parseLegacy(e, entries, where, warnings));
      if (!sections.length) {
        warnings.push(`${where}: no instructions.`);
        sections.push({ type: "text", text: title });
      }
      const fit = fitBlocks(sections, ex.minutes);
      if (fit.changed) warnings.push(`${where}: block minutes didn't add up to ${ex.minutes}; scaled them.`);
      if (ex.minutes > 5 && blocksOf(fit.sections).length < 2) warnings.push(`${where}: over 5 minutes in one block; split it.`);
      if (mixesSingAndPlay(fit.sections)) warnings.push(`${where}: asks to both sing and play; keep it to one.`);
      if (tempoWithoutMetronome(fit.sections)) warnings.push(`${where}: asks for a tempo but shows no metronome; add one.`);
      for (const w of keyWarnings(fit.sections)) warnings.push(`${where}: ${w}`);
      ex.sections = fit.sections;
      Object.assign(ex, exerciseLevelArea(e));
      const tags = exerciseTags(e.tags, sections);
      if (tags.length) ex.tags = tags;
      Object.assign(ex, topicTags(e, ex.area, where, warnings));
      const untagged = [!ex.level && "level", !ex.area && "area", !tags.length && "kind", !ex.topic && "topic"].filter(Boolean);
      if (untagged.length) warnings.push(`${where}: no ${untagged.join(", ")} tag.`);
      const why = str(e.why, 300);
      if (why) ex.why = why;
      Object.assign(ex, parseSlots(e, entries, where, warnings));
      return [ex];
    });
    if (!exercises.length) return { ok: false, error: `Day ${d + 1} has no exercises.` };
    days.push({ theme: str(day.theme, 80) || `Day ${d + 1}`, exercises });
  }
  const summary = str(obj.summary, 400);
  const progress = str(obj.progress, MAX_PROGRESS);
  if (!progress) warnings.push("No progress summary in the reply.");
  return { ok: true, config: { title: str(obj.title, 80) || "My practice week", ...(summary ? { summary } : {}), ...(progress ? { progress } : {}), days }, warnings };
}
