import { checkLink, type CatalogueEntry } from "./catalogue";
import { parseTool, type PlanTool } from "./tools";
import { PLAN_DAYS, type PlanConfig, type PlanDay, type PlanExercise } from "./types";

export type ParseResult = { ok: true; config: PlanConfig; warnings: string[] } | { ok: false; error: string };

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

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
      const ex: PlanExercise = { title, minutes: Number.isFinite(minutes) ? Math.min(120, Math.max(1, minutes)) : 10, how: str(e.how) };
      const focus = str(e.focus, 120);
      if (focus) ex.focus = focus;
      const steps = Array.isArray(e.steps) ? e.steps.map((s) => str(s, 240)).filter(Boolean).slice(0, 8) : [];
      if (steps.length) ex.steps = steps;
      const tools = (Array.isArray(e.tools) ? e.tools : []).map(parseTool).filter((t): t is PlanTool => t !== null).slice(0, 3);
      if (Array.isArray(e.tools) && tools.length < Math.min(e.tools.length, 3)) warnings.push(`Day ${d + 1}, exercise ${i + 1}: left out a tool it couldn't show.`);
      if (tools.length) ex.tools = tools;
      const why = str(e.why, 300);
      if (why) ex.why = why;
      if (e.link != null && e.link !== "") {
        const link = checkLink(e.link, entries);
        if (link) ex.link = link;
        else warnings.push(`Day ${d + 1}, exercise ${i + 1}: dropped the link "${String(e.link)}" (not an attunr page).`);
      }
      return [ex];
    });
    if (!exercises.length) return { ok: false, error: `Day ${d + 1} has no exercises.` };
    days.push({ theme: str(day.theme, 80) || `Day ${d + 1}`, exercises });
  }
  const summary = str(obj.summary, 400);
  return { ok: true, config: { title: str(obj.title, 80) || "My practice week", ...(summary ? { summary } : {}), days }, warnings };
}
