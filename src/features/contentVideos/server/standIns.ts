import { readCues, type StandInSeed } from "../model/standIn";
import type { ContentVideoRepo, ContentVideoRow } from "./repo";

/** What a seed did with one stand-in. */
export type StandInOutcome =
  | { tool: string; id: string; did: "added"; steps: string[] | null }
  | { tool: string; id: string; did: "kept" | "covered" | "taken" | "bad" };

/**
 * Puts the stand-in seeds (`library/seed/videos`, `standIn.ts`) into the content videos (`npm run db:seed-videos`). A stand-in
 * is written once, through `create`, at the levels of its tool that no other video holds, so it never takes a level off a
 * recorded video: recording one later takes that level off the stand-in, as any newer video does. One already stored
 * (`kept`) is left as it is; a tool whose every level has a video is `covered` and gets none. Running it again changes nothing.
 */
export async function seedStandIns(repo: ContentVideoRepo, seeds: StandInSeed[], now: Date): Promise<StandInOutcome[]> {
  const out: StandInOutcome[] = [];
  const all = await repo.list();
  for (const seed of seeds) {
    const { tool, id } = seed;
    if (!readCues(seed.cues)) { out.push({ tool, id, did: "bad" }); continue; }
    if (await repo.get(id)) { out.push({ tool, id, did: "kept" }); continue; }
    const others = all.filter((r) => r.tool === tool);
    let steps: string[] | null;
    if (seed.steps === null) {
      if (others.length) { out.push({ tool, id, did: "covered" }); continue; }
      steps = null;
    } else {
      const held = new Set(others.flatMap((r) => r.steps ?? []));
      steps = seed.steps.filter((s) => !held.has(s));
      if (!steps.length) { out.push({ tool, id, did: "covered" }); continue; }
    }
    const row: ContentVideoRow = {
      id, title: seed.title, note: "", recordedBy: null, madeFor: seed.madeFor, tool: null, steps: null,
      type: "script", seconds: seed.seconds, width: seed.width, height: seed.height, size: 0, blobPath: null, overlay: null,
      cues: seed.cues, createdAt: now,
    };
    const made = await repo.create(row, { kind: "tool", tool, steps });
    out.push(made.ok ? { tool, id, did: "added", steps } : { tool, id, did: "taken" });
  }
  return out;
}
