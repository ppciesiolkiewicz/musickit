import { checkLink, type CatalogueEntry } from "./catalogue";
import { exerciseTags, legacySections, parseSection, parseTool, type Section } from "./tools";
import { PLAN_DAYS, type PlanConfig, type PlanDay, type PlanExercise } from "./types";

export type ParseResult = { ok: true; config: PlanConfig; warnings: string[] } | { ok: false; error: string };

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Sections from the AI's list; what can't be shown (a tool for an unknown scale, an unknown link) is left out with a warning. */
function parseSections(raw: unknown[], entries: CatalogueEntry[], where: string, warnings: string[]): Section[] {
  const out = raw.slice(0, 24).map((r) => parseSection(r, entries));
  const dropped = out.filter((s) => !s).length;
  if (dropped) warnings.push(`${where}: left out ${dropped} section${dropped > 1 ? "s" : ""} it couldn't show.`);
  return out.filter((s): s is Section => s !== null);
}

/** An exercise in the earlier shape (how / steps / tools / link), as sections. */
function parseLegacy(e: Record<string, unknown>, entries: CatalogueEntry[], where: string, warnings: string[]): Section[] {
  const steps = Array.isArray(e.steps) ? e.steps.map((s) => str(s, 240)).filter(Boolean).slice(0, 8) : [];
  const rawTools = Array.isArray(e.tools) ? e.tools.slice(0, 6) : [];
  const tools = rawTools.flatMap((t) => {
    const p = parseTool(t);
    const step = Number((t as { step?: unknown })?.step);
    return p ? [Number.isInteger(step) && step >= 1 && step <= 8 ? { ...p, step } : p] : [];
  });
  if (tools.length < rawTools.length) warnings.push(`${where}: left out a tool it couldn't show.`);
  let link: string | undefined;
  if (e.link != null && e.link !== "") {
    link = checkLink(e.link, entries);
    if (!link) warnings.push(`${where}: dropped the link "${String(e.link)}" (not an attunr page).`);
  }
  return legacySections({ how: str(e.how), steps, tools, link });
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
 * A pasted plan, checked and tidied: seven days, each with at least one exercise, minutes 1..120, links only to attunr pages
 * (an unknown link is dropped with a warning, the exercise kept). Extra days are cut, missing ones are an error.
 */
export function parsePlanConfig(text: string, entries: CatalogueEntry[]): ParseResult {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    return { ok: false, error: e instanceof SyntaxError ? "That isn't valid JSON. Copy the AI's whole code block again." : (e as Error).message };
  }
  const obj = raw as { title?: unknown; summary?: unknown; days?: unknown };
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
      const sections = Array.isArray(e.sections) ? parseSections(e.sections, entries, where, warnings) : parseLegacy(e, entries, where, warnings);
      if (!sections.length) {
        warnings.push(`${where}: no instructions.`);
        sections.push({ type: "text", text: title });
      }
      ex.sections = sections;
      const tags = exerciseTags(e.tags, sections);
      if (tags.length) ex.tags = tags;
      const why = str(e.why, 300);
      if (why) ex.why = why;
      return [ex];
    });
    if (!exercises.length) return { ok: false, error: `Day ${d + 1} has no exercises.` };
    days.push({ theme: str(day.theme, 80) || `Day ${d + 1}`, exercises });
  }
  const summary = str(obj.summary, 400);
  return { ok: true, config: { title: str(obj.title, 80) || "My practice week", ...(summary ? { summary } : {}), days }, warnings };
}
