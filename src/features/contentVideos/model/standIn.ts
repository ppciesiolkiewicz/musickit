import { VIDEO_PLANS, type Beat } from "./scripts";

/**
 * A stand-in video: a scripted tool's video before it is recorded. No file and no row: the lookup gives it to a tool cell
 * that has no recorded video, and the player shows the script's words as timed captions on black (`ui/ScriptVideo.tsx`).
 * A recorded video for the cell's level wins, so recording one replaces the stand-in there with no other change. Pure.
 */

const PREFIX = "script:";

/** The stand-in's id for a tool key: `script:<tool key>`. Never a video id (`isVideoId`), so it never reaches the file route. */
export const standInId = (tool: string): string => `${PREFIX}${tool}`;
export const isStandIn = (id: string): boolean => id.startsWith(PREFIX);

/** The stand-in a tool cell falls back to: the tool's scripted video, or null for a tool with no script. */
export const standInFor = (tool: string): string | null => (Object.hasOwn(VIDEO_PLANS, tool) ? standInId(tool) : null);

/** The script a stand-in id plays, or null. */
export const standInPlan = (id: string) => {
  const tool = id.slice(PREFIX.length);
  return isStandIn(id) && Object.hasOwn(VIDEO_PLANS, tool) ? VIDEO_PLANS[tool] : null;
};

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
