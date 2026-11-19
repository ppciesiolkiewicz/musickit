/**
 * One-off (2026-11-19, kept for the record): turns the seed files into blocks with choices
 * (docs/superpowers/specs/2026-11-19-block-ids-and-choices-design.md). A block file's `level`, `steps`, `moves` and
 * `minutes` move into one choice, named by its level (`main` when it has none). Each exercise written inline in a plan
 * moves out to a block file of its own, `<plan id>-<slug of its title>`, and the plan's day names it by block and choice.
 * A plan exercise identical to a block file or to one already moved (the same hashed block id, as the library dedupes
 * them) becomes a ref to that one. Nothing is rewritten: files keep their text and `versions`.
 *
 *   npx tsx scripts/seed-split.ts          convert src/features/library/seed in place and print the report
 *
 * Then `npm run -s gen:json-index`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SeedBlockFile, SeedBlockRef, SeedChoice, SeedPlanFile } from "../src/features/library/seed";
import { blockIdOf, blockKeyOf } from "../src/features/plan/model/blockId";
import { catalogue } from "../src/features/plan/model/catalogue";
import { parseExercise } from "../src/features/plan/model/config";
import type { Level } from "../src/features/plan/model/types";

/** A block file before the split: the exercise holds its own level, steps, moves and minutes. */
export type OldBlockFile = Omit<SeedBlockFile, "choices">;
/** A plan file before the split: each day's exercises are written out in full. */
export type OldPlanFile = SeedPlanFile;

const MAX_SLUG = 60;

/** A title as id words: lowercase, `{{=key}}` params and `{{3}}` note marks and punctuation dropped, ♯/♭ as words, joined by `-`, at most 60 characters on a word boundary; `exercise` when nothing is left. */
export function slugOf(title: string): string {
  const words = title
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/♯/g, " sharp ")
    .replace(/♭/g, " flat ")
    .replace(/['’]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let slug = "";
  for (const w of words) {
    const next = slug ? `${slug}-${w}` : w;
    if (next.length > MAX_SLUG) break;
    slug = next;
  }
  return slug || (words[0] ?? "").slice(0, MAX_SLUG) || "exercise";
}

const MOVED = ["level", "steps", "moves", "minutes"] as const;

/** The exercise without what moves into a choice, and that choice. */
function choiceOf(exercise: Record<string, unknown>): { exercise: Record<string, unknown>; choice: SeedChoice } {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(exercise)) if (!(MOVED as readonly string[]).includes(k)) rest[k] = v;
  const level = typeof exercise.level === "string" ? (exercise.level as Level) : undefined;
  const choice: SeedChoice = {
    name: level ?? "main",
    ...(level !== undefined ? { level } : {}),
    steps: Array.isArray(exercise.steps) ? (exercise.steps as string[]) : [],
    ...(exercise.moves !== undefined ? { moves: exercise.moves } : {}),
    minutes: Number(exercise.minutes),
  };
  return { exercise: rest, choice };
}

export function splitSeed(oldBlocks: OldBlockFile[], oldPlans: OldPlanFile[]): { blocks: SeedBlockFile[]; plans: SeedPlanFile[]; report: string[] } {
  const entries = catalogue();
  const report: string[] = [];
  // the hashed block id an exercise has today: what the library dedupes by
  const identity = (raw: Record<string, unknown>, where: string): string => {
    const { block } = parseExercise(raw, where, entries);
    if (block) return blockIdOf(blockKeyOf(block));
    report.push(`${where}: does not parse; matched by its JSON only.`);
    return `raw:${JSON.stringify(raw)}`;
  };
  const blocks: SeedBlockFile[] = [];
  const byIdentity = new Map<string, { id: string; choice: SeedChoice }>();
  const ids = new Set<string>();
  for (const f of oldBlocks) {
    const { exercise, choice } = choiceOf(f.exercise);
    const file: SeedBlockFile = { id: f.id, model: f.model, versions: f.versions, note: f.note, ...(f.showcase ? { showcase: f.showcase } : {}), exercise, choices: [choice] };
    blocks.push(file);
    ids.add(f.id);
    const key = identity(f.exercise, `blocks/${f.id}.json`);
    if (!byIdentity.has(key)) byIdentity.set(key, { id: f.id, choice });
    else report.push(`blocks/${f.id}.json is identical to blocks/${byIdentity.get(key)!.id}.json; both kept.`);
  }
  let moved = 0;
  let folded = 0;
  const plans = oldPlans.map((p): SeedPlanFile => {
    const days = Array.isArray(p.plan.days) ? (p.plan.days as Record<string, unknown>[]) : [];
    const newDays = days.map((d, i) => {
      const list = Array.isArray(d.exercises) ? (d.exercises as Record<string, unknown>[]) : [];
      const refs = list.map((raw, j): SeedBlockRef => {
        const where = `plans/${p.id}.json, day ${i + 1}, exercise ${j + 1}`;
        const key = identity(raw, where);
        const minutes = Number(raw.minutes);
        const found = byIdentity.get(key);
        if (found) {
          folded++;
          report.push(`${where}: folded into ${found.id} (identical).`);
          return { block: found.id, choice: found.choice.name, ...(minutes !== found.choice.minutes ? { minutes } : {}) };
        }
        const { exercise, choice } = choiceOf(raw);
        const base = `${p.id}-${slugOf(String(raw.title ?? ""))}`;
        let id = base;
        for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
        ids.add(id);
        blocks.push({ id, model: p.model, versions: p.versions, note: `Moved from plans/${p.id}.json, day ${i + 1}.`, exercise, choices: [choice] });
        byIdentity.set(key, { id, choice });
        moved++;
        return { block: id, choice: choice.name };
      });
      return { ...d, exercises: refs };
    });
    return { ...p, plan: { ...p.plan, days: newDays } };
  });
  report.unshift(
    `block files: ${oldBlocks.length} before, ${blocks.length} after`,
    `plan exercises: ${moved + folded}; moved to new block files: ${moved}; folded as duplicates: ${folded}`,
  );
  return { blocks, plans, report };
}

function main() {
  const seed = path.join(__dirname, "../src/features/library/seed");
  const read = <T>(dir: string): T[] =>
    readdirSync(path.join(seed, dir)).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(path.join(seed, dir, f), "utf8")) as T);
  const oldBlocks = read<OldBlockFile & { choices?: unknown }>("blocks");
  if (oldBlocks.some((b) => b.choices)) throw new Error("the seed is already split");
  const { blocks, plans, report } = splitSeed(oldBlocks, read<OldPlanFile>("plans"));
  const write = (dir: string, f: { id: string }) => writeFileSync(path.join(seed, dir, `${f.id}.json`), `${JSON.stringify(f, null, 2)}\n`);
  for (const b of blocks) write("blocks", b);
  for (const p of plans) write("plans", p);
  console.log(report.join("\n"));
}

if (require.main === module) main();
