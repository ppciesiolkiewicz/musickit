import { SEED_BLOCKS, SEED_PLANS, type SeedBlockFile, type SeedBlockRef, type SeedPlanFile } from "@/features/library/seed";
import { exerciseOf } from "@/features/library/seed/choices";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { blockKeyOf, choiceIdOf } from "@/features/plan/model/blockId";
import { levelOfSteps } from "@/features/plan/model/path";
import type { CuratedBlock, CuratedChoice, PlanBlockRow, Provenance, UserDataRepo } from "./repo";

/**
 * The seed block files as curated blocks: the file's id, its exercise's content (without moves), tags and slot (why,
 * lessons), its model and versions, and one choice per choice in the file, in file order (`place`), each parsed as the
 * exercise `exerciseOf` makes of it: its level (the choice's, else its steps' highest), steps, moves and minutes; a
 * `draft` choice is inactive. A file whose exercise doesn't parse is left out and named in `skipped`.
 */
export function curatedBlocks(files: SeedBlockFile[] = SEED_BLOCKS): { blocks: CuratedBlock[]; skipped: string[] } {
  const entries = catalogue();
  const blocks: CuratedBlock[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    const parsed = (f.choices ?? []).map((c) => ({ c, e: parseExercise(exerciseOf(f, c), f.id, entries).block }));
    const first = parsed[0]?.e;
    if (!first || parsed.some((p) => !p.e)) {
      skipped.push(f.id);
      continue;
    }
    const key = blockKeyOf(first);
    const { moves: _moves, ...content } = key.content;
    void _moves;
    const provenance: Provenance = { model: f.model, promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching };
    const choices: CuratedChoice[] = parsed.map(({ c, e }, place) => {
      const k = blockKeyOf(e!);
      const steps = k.steps ?? [];
      return { id: choiceIdOf(f.id, c.name), name: c.name, level: e!.level ?? levelOfSteps(steps) ?? null, steps, moves: e!.moves ?? null, minutes: e!.minutes, active: !c.draft, place };
    });
    blocks.push({
      id: f.id,
      content,
      area: key.area ?? null,
      topic: key.topic ?? null,
      concepts: key.concepts ?? [],
      tags: key.tags ?? [],
      slot: { ...(first.why ? { why: first.why } : {}), ...(first.learnBefore?.length ? { learnBefore: [...first.learnBefore] } : {}), ...(first.exploreMore?.length ? { exploreMore: [...first.exploreMore] } : {}) },
      provenance,
      choices,
    });
  }
  return { blocks, skipped };
}

/**
 * A seed plan file's `practice_plan_blocks` rows, from its refs: one per ref, `day` and `place` from 0, naming the block
 * and its choice, with the ref's minutes or else the choice's. A ref to a block or choice not in `blocks` is left out
 * and named in `unknown` (`<block>/<choice>`), and the places close up, as `expandPlan` leaves it out of the reply.
 */
export function planRowsOf(file: SeedPlanFile, blocks: CuratedBlock[]): { rows: PlanBlockRow[]; unknown: string[] } {
  const choices = new Map(blocks.flatMap((b) => b.choices.map((c) => [c.id, { blockId: b.id, c }] as const)));
  const rows: PlanBlockRow[] = [];
  const unknown: string[] = [];
  const days = Array.isArray(file.plan.days) ? (file.plan.days as Record<string, unknown>[]) : [];
  days.forEach((d, day) => {
    const refs = Array.isArray(d.exercises) ? (d.exercises as SeedBlockRef[]) : [];
    let place = 0;
    for (const r of refs) {
      const id = choiceIdOf(r.block, r.choice);
      const hit = choices.get(id);
      if (!hit || hit.blockId !== r.block) {
        unknown.push(id);
        continue;
      }
      rows.push({ day, place: place++, blockId: r.block, choiceId: id, minutes: r.minutes ?? hit.c.minutes });
    }
  });
  return { rows, unknown };
}

function secs(since: number): string {
  return `${((Date.now() - since) / 1000).toFixed(1)}s`;
}

/**
 * Puts the seed block files in the library as curated blocks with their choices (`upsertCurated`: the file is the source
 * of truth, so a second run with the same files changes nothing, and a choice no longer in a file is made inactive), then
 * each seed plan's rows in `practice_plan_blocks` from its refs. `plans` must already be in `practice_plans` (the script
 * passes the ones `db:seed-plans` stored). Returns the counts, the skipped block files and the refs that name nothing.
 */
export async function seedBlocks(
  repo: UserDataRepo,
  now: Date,
  { files = SEED_BLOCKS, plans = SEED_PLANS, log = () => {} }: { files?: SeedBlockFile[]; plans?: SeedPlanFile[]; log?: (line: string) => void } = {},
): Promise<{ blocks: number; choices: number; deactivated: number; planBlocks: number; skipped: string[]; unknownRefs: string[] }> {
  const { blocks, skipped } = curatedBlocks(files);
  for (const id of skipped) log(`skipped  ${id}  (exercise does not parse)`);
  for (const b of blocks) log(`block  ${b.id}  ${b.choices.map((c) => `${c.name}${c.active ? "" : " (draft)"}`).join(", ")}`);
  log(`${blocks.length} curated blocks, ${blocks.reduce((n, b) => n + b.choices.length, 0)} choices from ${files.length} block files; storing in one transaction…`);
  let t = Date.now();
  const stored = await repo.upsertCurated(blocks, now);
  log(`stored blocks and choices in ${secs(t)}; ${stored.deactivated} choice${stored.deactivated === 1 ? "" : "s"} made inactive`);
  let planBlocks = 0;
  const unknownRefs: string[] = [];
  t = Date.now();
  for (const [i, p] of plans.entries()) {
    const { rows, unknown } = planRowsOf(p, blocks);
    for (const u of unknown) log(`plan ${p.id}: no block and choice ${u}; left out`);
    unknownRefs.push(...unknown.map((u) => `${p.id}: ${u}`));
    await repo.setPlanBlocks(p.id, rows);
    planBlocks += rows.length;
    log(`plan ${i + 1}/${plans.length}  ${p.id}  ${rows.length} rows`);
  }
  if (plans.length) log(`plan block rows written in ${secs(t)}`);
  return { ...stored, planBlocks, skipped, unknownRefs };
}
