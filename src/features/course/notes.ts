/**
 * What a student notes about a section: how well they know it, how they like it, whether to keep it close,
 * tags and a free note. Lives in the browser only; this file is the pure part (shapes, parsing, display).
 */

export type Know = "new" | "getting" | "solid" | "own";
export const KNOW: { id: Know; emoji: string; label: string }[] = [
  { id: "new", emoji: "🌱", label: "new" },
  { id: "getting", emoji: "🌿", label: "getting there" },
  { id: "solid", emoji: "🌳", label: "solid" },
  { id: "own", emoji: "🏆", label: "own it" },
];

export type Like = 1 | 2 | 3 | 4;
export const LIKE: { id: Like; emoji: string; label: string }[] = [
  { id: 1, emoji: "😖", label: "not for me" },
  { id: 2, emoji: "😐", label: "it's ok" },
  { id: 3, emoji: "🙂", label: "like it" },
  { id: 4, emoji: "😍", label: "love it" },
];

export interface SectionNotes { know?: Know; like?: Like; often?: boolean; warmup?: boolean; tags: string[]; note: string }
export const EMPTY_NOTES: SectionNotes = { tags: [], note: "" };

export interface Tag { id: string; emoji?: string; text: string }

const t = (id: string, emoji: string, text: string): Tag => ({ id, emoji, text });
export const PRESET_TAGS: Tag[] = [
  t("clicked", "💡", "it clicked"),
  t("confusing", "🤯", "confusing"),
  t("head-not-hands", "🧠", "head gets it, hands don't"),
  t("hands-not-head", "✋", "hands get it, head doesn't"),
  t("slower", "🐢", "need it slower"),
  t("timing", "🎯", "timing is off"),
  t("buzzing", "🔇", "buzzing / muted strings"),
  t("hurts", "🤕", "hurts my fingers"),
  t("looking", "👀", "still looking at my hands"),
  t("cant-hear", "👂", "can't hear it yet"),
  t("tiring", "🪫", "tiring"),
  t("too-hard", "🧗", "too hard for now"),
  t("skip", "⏭️", "skip for now"),
  t("boring", "🥱", "boring"),
  t("sounds-great", "🎶", "sounds great"),
  t("favourite", "🌟", "favourite"),
  t("in-songs", "🎸", "using it in songs"),
  t("want-song", "🎤", "want a song with this"),
  t("metronome", "⏱️", "practise with metronome"),
  t("ask-teacher", "🤝", "ask my teacher"),
  t("record", "📹", "record myself"),
  t("connects", "🧩", "connects to something else"),
  t("improvise", "🎨", "want to improvise with it"),
  t("write-out", "📝", "write it out"),
];

export const noteKey = (stage: string, section: string) => `${stage}/${section}`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const parse = (raw: string | null): unknown => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

function cleanNotes(v: unknown): SectionNotes | null {
  if (!isObj(v)) return null;
  const out: SectionNotes = { tags: Array.isArray(v.tags) ? v.tags.filter((x): x is string => typeof x === "string") : [], note: typeof v.note === "string" ? v.note : "" };
  if (KNOW.some((k) => k.id === v.know)) out.know = v.know as Know;
  if (LIKE.some((l) => l.id === v.like)) out.like = v.like as Like;
  if (v.often === true) out.often = true;
  if (v.warmup === true) out.warmup = true;
  return out;
}

/** The stored notes, keyed by `noteKey`. Anything unreadable is dropped; never throws. */
export function parseNotesStore(raw: string | null): Record<string, SectionNotes> {
  const v = parse(raw);
  if (!isObj(v)) return {};
  const out: Record<string, SectionNotes> = {};
  for (const [k, n] of Object.entries(v)) {
    const c = cleanNotes(n);
    if (c) out[k] = c;
  }
  return out;
}

export function parseCustomTags(raw: string | null): Tag[] {
  const v = parse(raw);
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Tag => isObj(x) && typeof x.id === "string" && typeof x.text === "string" && (x.emoji === undefined || typeof x.emoji === "string"))
    .map((x) => (x.emoji ? { id: x.id, emoji: x.emoji, text: x.text } : { id: x.id, text: x.text }));
}

const LEADING_EMOJI = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?/u;
const MAX_TAG = 24;
const sameTag = (a: Tag, b: Tag) => (a.emoji ?? "") === (b.emoji ?? "") && a.text.toLowerCase() === b.text.toLowerCase();

/** A tag from what the student typed: an optional leading emoji, then words. Null if blank or already there. */
export function makeCustomTag(input: string, existing: Tag[]): Tag | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(LEADING_EMOJI);
  const emoji = m?.[0];
  const text = (emoji ? s.slice(emoji.length) : s).trim().slice(0, MAX_TAG);
  if (!emoji && !text) return null;
  const tag: Tag = emoji ? { id: `c:${emoji}${text.toLowerCase()}`, emoji, text } : { id: `c:${text.toLowerCase()}`, text };
  // words alone also clash with a tag that has the same words and an emoji ("it clicked" vs "💡 it clicked")
  if (existing.some((e) => e.id === tag.id || sameTag(e, tag) || (!emoji && e.text.toLowerCase() === text.toLowerCase()))) return null;
  return tag;
}

export function hasNotes(n: SectionNotes): boolean {
  return !!(n.know || n.like || n.often || n.warmup || n.tags.length || n.note.trim());
}

/** The short row of signs shown next to a section in lists. */
export function compactMarks(n: SectionNotes, tags: Tag[]): string[] {
  const out: string[] = [];
  const k = KNOW.find((x) => x.id === n.know);
  const l = LIKE.find((x) => x.id === n.like);
  if (k) out.push(k.emoji);
  if (l) out.push(l.emoji);
  if (n.often) out.push("🔁");
  if (n.warmup) out.push("🔥");
  n.tags.forEach((id) => {
    const tag = tags.find((x) => x.id === id);
    if (tag) out.push(tag.emoji ?? tag.text.split(/\s+/)[0]);
  });
  if (n.note.trim()) out.push("📝");
  return out;
}
