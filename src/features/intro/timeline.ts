/**
 * The intro's clock: when each scene starts, how long it lasts and when its cues fire. A scene lasts as long as its
 * narration (from the voice manifest written by `scripts/intro/voice.mjs`); a scene with no matching recording gets an
 * estimate from its word count, so the tour still plays, silent with captions. Pure.
 */

export type IntroScene = {
  id: string;
  /** a short label for the scene chips under the stage */
  caption: string;
  /** what the narrator says, also the subtitles above the slider */
  text: string;
  /** cue name → a phrase of `text`; the cue fires when the narrator starts that phrase */
  cues: Record<string, string>;
};

export type IntroScript = { title: string; scenes: IntroScene[] };

/** One recorded scene, as the voice script writes it. */
export type VoiceTake = {
  /** the text it was recorded from: a scene whose text has changed since is estimated instead */
  text: string;
  /** the file under /public, e.g. "/intro/hello.mp3" */
  file: string;
  /** seconds of audio */
  duration: number;
  /** cue name → seconds into the take */
  cues: Record<string, number>;
  /** the cue times were spread over the take by character position, not read from the voice's timings */
  estimated?: boolean;
};

export type VoiceManifest = { voice?: string; model?: string; scenes: Record<string, VoiceTake> };

export type TimedScene = IntroScene & {
  /** seconds from the start of the tour */
  start: number;
  /** seconds the scene is on screen: the narration plus a short breath */
  duration: number;
  /** cue name → seconds into the scene */
  at: Record<string, number>;
  /** the narration file, when there is a recording of this exact text */
  audio?: string;
  /** the subtitles: `text` one sentence at a time, each with the second into the scene it starts */
  lines: SubtitleLine[];
};

export type SubtitleLine = { text: string; at: number };

/** The pause after each scene's narration before the next one starts. */
export const BREATH = 0.7;
/** Words a second for a scene with no recording: an unhurried narrator. */
export const WORDS_PER_SECOND = 2.6;

/** Where `phrase` starts in `text`. Throws when it isn't there, so a cue can't silently drift to 0. */
export function phraseIndex(text: string, phrase: string): number {
  const i = text.indexOf(phrase);
  if (i < 0) throw new Error(`cue "${phrase}" is not in "${text}"`);
  return i;
}

function estimate(scene: IntroScene): { speech: number; at: Record<string, number> } {
  const words = scene.text.split(/\s+/).filter(Boolean).length;
  const speech = Math.max(2, words / WORDS_PER_SECOND);
  const at: Record<string, number> = {};
  for (const [name, phrase] of Object.entries(scene.cues)) at[name] = (phraseIndex(scene.text, phrase) / scene.text.length) * speech;
  return { speech, at };
}

/**
 * A scene's text as subtitles, one sentence at a time. A recording keeps a time for each cue, not for each sentence, so a
 * sentence starts where its first letter falls between the times known around it: the scene's start, its cues, the end of
 * the speech.
 */
export function subtitles(scene: IntroScene, speech: number, at: Record<string, number>): SubtitleLine[] {
  const known: [number, number][] = [[0, 0]];
  const cues = Object.entries(scene.cues)
    .map(([name, phrase]): [number, number] => [scene.text.indexOf(phrase), at[name]])
    .sort((a, b) => a[0] - b[0]);
  for (const [i, t] of cues) {
    const [pi, pt] = known[known.length - 1];
    if (i > pi && t > pt && t < speech) known.push([i, t]); // a cue out of order would run the subtitles backwards
  }
  known.push([scene.text.length, speech]);
  const timeOf = (i: number) => {
    const k = Math.max(1, known.findIndex(([ki]) => ki >= i));
    const [i0, t0] = known[k - 1];
    const [i1, t1] = known[k];
    return t0 + ((i - i0) / (i1 - i0)) * (t1 - t0);
  };
  const lines: SubtitleLine[] = [];
  for (const m of scene.text.matchAll(/\S[^.?]*[.?]*/g)) lines.push({ text: m[0].trim(), at: timeOf(m.index) });
  return lines;
}

/** The subtitle on screen `local` seconds into a scene. */
export function subtitleAt(scene: TimedScene, local: number): string {
  for (let i = scene.lines.length - 1; i >= 0; i--) if (local >= scene.lines[i].at) return scene.lines[i].text;
  return scene.lines[0]?.text ?? "";
}

export function timeline(script: IntroScript, voice?: VoiceManifest): TimedScene[] {
  let start = 0;
  return script.scenes.map((scene) => {
    const take = voice?.scenes[scene.id];
    const recorded = take && take.text === scene.text && take.duration > 0;
    const { speech, at } = recorded ? { speech: take.duration, at: { ...estimate(scene).at, ...take.cues } } : estimate(scene);
    const timed: TimedScene = { ...scene, start, duration: speech + BREATH, at, lines: subtitles(scene, speech, at), ...(recorded ? { audio: take.file } : {}) };
    start += timed.duration;
    return timed;
  });
}

export const totalLength = (scenes: TimedScene[]) => scenes.reduce((s, x) => s + x.duration, 0);

/** The scene playing at `t` seconds (the last one past the end). */
export function sceneAt(scenes: TimedScene[], t: number): number {
  for (let i = scenes.length - 1; i >= 0; i--) if (t >= scenes[i].start) return i;
  return 0;
}

/** How far a cue is through its moment: 0 before it, rising to 1 over `ramp` seconds after it. For CSS transitions in a scene. */
export function cueProgress(local: number, at: number | undefined, ramp = 0.4): number {
  if (at === undefined) return 0;
  return Math.min(1, Math.max(0, (local - at) / ramp));
}

/** The time as m:ss. */
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
