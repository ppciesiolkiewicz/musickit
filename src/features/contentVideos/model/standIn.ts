import { VIDEO_PLANS, type Beat } from "./scripts";
import { stepsOfTool } from "./slot";

/**
 * A stand-in video: a scripted tool's video before it is recorded, its script's words as timed captions on black
 * (`ui/ScriptVideo.tsx`). The stand-ins are seed files, `src/features/library/seed/videos/<file>.json`, one per tool in
 * `VIDEO_PLANS`, written by `scripts/gen-stand-in-seeds.ts` (`standInSeed`) and kept in step with the scripts by
 * `server/standInSeeds.test.ts`. Not enabled: no seed command puts them in the database, `db:seed-blocks` never reads
 * them, and the lookup serves none. Pure.
 */

/** A stand-in's seed file: a `content_videos` row for every level of its tool, with `cues` in place of a file. */
export interface StandInSeed {
  /** the row's id, kept across rewrites of the file */
  id: string;
  kind: "script";
  madeFor: string;
  tool: string;
  /** every level of the tool and No level (`stepsOfTool`); null for a tool with no ladder */
  steps: string[] | null;
  title: string;
  seconds: number;
  width: number;
  height: number;
  cues: Cue[];
}

/** The file name of a tool's stand-in: the tool key with `:` as `--` (`guitar-play-along--riff.json`). */
export const standInFile = (tool: string): string => `${tool.replace(/:/g, "--")}.json`;

/** A tool's stand-in seed from its script; null for a tool with no script. `id` is the file's id when it has one. */
export function standInSeed(tool: string, id: string): StandInSeed | null {
  if (!Object.hasOwn(VIDEO_PLANS, tool)) return null;
  const plan = VIDEO_PLANS[tool];
  const { cues, seconds } = scriptCues(plan.script);
  return { id, kind: "script", madeFor: `tool:${tool}`, tool, steps: stepsOfTool(tool), title: plan.title, seconds, width: 1920, height: 1080, cues };
}

/** One caption: a line of what is said, with what is on screen for its part, from `start` to `end` seconds. */
export interface Cue { start: number; end: number; show: string; say: string }

/** Reading pace: about 2.5 words a second, at least 3 seconds a line, and a short pause between parts. */
const WORDS_PER_SECOND = 2.5;
const MIN_LINE = 3;
const PART_GAP = 1;

/** `[the chord]` reads "the chord": the brackets are for the person recording, not the player. */
export const plainSay = (line: string): string => line.replace(/\[([^\]]*)\]/g, "$1").trim();

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** A script as captions: each line of each part's words is one cue, timed at reading pace; `seconds` is the whole length. */
export function scriptCues(script: Beat[]): { cues: Cue[]; seconds: number } {
  const cues: Cue[] = [];
  let t = 0;
  script.forEach((beat, i) => {
    if (i > 0) t += PART_GAP;
    for (const raw of beat.say.split("\n")) {
      const say = plainSay(raw);
      if (!say) continue;
      const len = Math.max(MIN_LINE, Math.round((words(say) / WORDS_PER_SECOND) * 10) / 10);
      cues.push({ start: t, end: t + len, show: beat.show, say });
      t += len;
    }
  });
  return { cues, seconds: Math.ceil(t) };
}

/** The cue at `t` seconds; in a gap, the one just before it; before the first, the first. */
export function cueAt(cues: Cue[], t: number): Cue | null {
  let found: Cue | null = cues[0] ?? null;
  for (const c of cues) {
    if (c.start > t) break;
    found = c;
  }
  return found;
}
