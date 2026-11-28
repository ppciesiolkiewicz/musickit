import { SEED_BLOCKS, type SeedBlockFile } from "@/features/library/seed";
import { choiceSetOf, exerciseOf } from "@/features/library/seed/choices";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { blockKeyOf, choiceIdOf } from "@/features/plan/model/blockId";
import { levelOfSteps } from "@/features/plan/model/path";
import type { CuratedBlock, CuratedChoice, DroppedVideo, Provenance, UserDataRepo } from "./repo";

/**
 * The seed block files as curated blocks: the file's id, its exercise's content as written (without moves, and without
 * any choice's `set` or `params` applied), tags and slot (why, lessons), its model and versions, and one choice per
 * choice in the file, in file order (`place`), each parsed as the exercise `exerciseOf` makes of it: its level (the
 * choice's, else its steps' highest), steps, moves, minutes and its set (`set` and `params`, `choiceSetOf`); a `draft`
 * choice is inactive. A file whose exercise, bare or as any choice, doesn't parse is left out and named in `skipped`.
 */
export function curatedBlocks(files: SeedBlockFile[] = SEED_BLOCKS): { blocks: CuratedBlock[]; skipped: string[] } {
  const entries = catalogue();
  const blocks: CuratedBlock[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    const parsed = (f.choices ?? []).map((c) => ({ c, e: parseExercise(exerciseOf(f, c), f.id, entries).block }));
    const first = f.choices?.length ? parseExercise(exerciseOf(f, f.choices[0], { bare: true }), f.id, entries).block : null;
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
      return { id: choiceIdOf(f.id, c.name), name: c.name, level: e!.level ?? levelOfSteps(steps) ?? null, steps, moves: e!.moves ?? null, set: choiceSetOf(c), minutes: e!.minutes, active: !c.draft, place };
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

/** A seed block file with a riff saved in the app laid over its own; null when the saved riff can't be read. */
export type KeepRiff = (file: SeedBlockFile, edit: unknown) => SeedBlockFile | null;

function secs(since: number): string {
  return `${((Date.now() - since) / 1000).toFixed(1)}s`;
}

/**
 * Puts the seed block files in the library as curated blocks with their choices (`upsertCurated`: the file is the source
 * of truth, so a second run with the same files changes nothing, and a choice no longer in a file is made inactive; a
 * stored block whose file changed, in its exercise or in a choice, gets the next `revision`, counted in `revised`). Seed plans
 * are not stored: they stay files (the demos read them). A block's own videos (`blocks.videos`) are kept, except an entry whose
 * tool cell's tool moved: it is dropped and returned in `droppedVideos`, with a line in the log. Returns the counts and the skipped block files.
 * With `keepRiff` (the script passes the riff maker's `keptRiff`), a block whose riff was saved in the app (`riffEdits`) is
 * stored with that riff over its file's, and named in `keptRiffs` with a `riff kept` line; everything else is the file's.
 * When a block file doesn't parse it writes nothing and returns that file in `skipped` with every count 0: storing the
 * rest would make the skipped block's choices inactive (and an empty list every choice).
 */
export async function seedBlocks(
  repo: UserDataRepo,
  now: Date,
  { files = SEED_BLOCKS, log = () => {}, keepRiff }: { files?: SeedBlockFile[]; log?: (line: string) => void; keepRiff?: KeepRiff } = {},
): Promise<{ blocks: number; choices: number; deactivated: number; revised: number; droppedVideos: DroppedVideo[]; keptRiffs: string[]; skipped: string[] }> {
  const keptRiffs: string[] = [];
  if (keepRiff) {
    const edits = new Map((await repo.riffEdits()).map((e) => [e.blockId, e]));
    files = files.map((f) => {
      const e = edits.get(f.id);
      if (!e) return f;
      const kept = keepRiff(f, e.edit);
      if (!kept) {
        log(`riff not kept  ${f.id}  (the riff saved in the app can't be read; the file's riff is stored)`);
        return f;
      }
      keptRiffs.push(f.id);
      log(`riff kept  ${f.id}  (saved in the app ${e.at.toISOString().slice(0, 10)}${e.byName ? ` by ${e.byName}` : ""})`);
      return kept;
    });
  }
  const { blocks, skipped } = curatedBlocks(files);
  for (const id of skipped) log(`skipped  ${id}  (exercise does not parse)`);
  if (skipped.length) {
    log(`${skipped.length} block file${skipped.length === 1 ? "" : "s"} did not parse; nothing written`);
    return { blocks: 0, choices: 0, deactivated: 0, revised: 0, droppedVideos: [], keptRiffs, skipped };
  }
  for (const b of blocks) log(`block  ${b.id}  ${b.choices.map((c) => `${c.name}${c.active ? "" : " (draft)"}`).join(", ")}`);
  log(`${blocks.length} curated blocks, ${blocks.reduce((n, b) => n + b.choices.length, 0)} choices from ${files.length} block files; storing in one transaction…`);
  const t = Date.now();
  const stored = await repo.upsertCurated(blocks, now);
  log(`stored blocks and choices in ${secs(t)}; ${stored.revised} changed block${stored.revised === 1 ? "" : "s"} got a new revision, ${stored.deactivated} choice${stored.deactivated === 1 ? "" : "s"} made inactive`);
  for (const d of stored.droppedVideos) log(`video dropped  ${d.blockId}  cell ${d.cell}  ${d.videoId}  (the video is kept; point the cell at it again)`);
  return { ...stored, keptRiffs, skipped };
}
