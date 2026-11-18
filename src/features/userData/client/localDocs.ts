import { legacyNoteKey } from "@/features/course/legacy";
import { parseNotesStore } from "@/features/course/notes";
import { GLOBAL_KEY, PAGE_KEY } from "@/features/guide/levelStorage";
import type { About, Records } from "../model";
import type { DocBackend, UserDocKind } from "./useUserDoc";

/*
 * The `local` source (no accounts, no database): each document is read from and written to the localStorage keys the
 * app used before, so a build without a database behaves as it always did. Several documents are made of more than one
 * key; each key is written as it was.
 */

/** v2: stage slugs renumbered 1–11; the old store is read once and moved over. */
const NOTES_KEY = "musickit.course.notes.v2";
const OLD_NOTES_KEY = "musickit.course.notes";
const CREATOR_KEY = "musickit.creator.key";
const IMPROV_KEY = "musickit.improv.stats";
const NOTE_GAME_KEY = "musickit.noteGame.best";
const ROLL_KEY = "musickit.lipRoll.accuracy";
/** the player's singing voice: a type or a range of their own (once a bare type name or range, which still read back) */
const VOICE_KEY = "singing.range";

const KEYS: Record<UserDocKind, string[]> = {
  course_notes: [NOTES_KEY],
  creator: [CREATOR_KEY],
  records: [IMPROV_KEY, NOTE_GAME_KEY, ROLL_KEY],
  about: [GLOBAL_KEY, PAGE_KEY],
  voice: [VOICE_KEY],
};

const read = (k: string): string | null => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* storage unavailable: kept for this visit only */
  }
};
const json = (k: string): unknown => {
  try {
    return JSON.parse(read(k) ?? "null");
  } catch {
    return null;
  }
};

function readDoc(kind: UserDocKind): unknown {
  switch (kind) {
    case "course_notes": {
      const stored = read(NOTES_KEY);
      if (stored !== null || read(OLD_NOTES_KEY) === null) return stored;
      const moved = Object.fromEntries(Object.entries(parseNotesStore(read(OLD_NOTES_KEY))).map(([k, n]) => [legacyNoteKey(k), n]));
      write(NOTES_KEY, JSON.stringify(moved));
      return moved;
    }
    case "creator":
      return json(CREATOR_KEY);
    case "records": {
      const improv = json(IMPROV_KEY) as { done?: unknown; best?: unknown } | null;
      return { improv: { done: Number(improv?.done) || 0, best: Number(improv?.best) || 0 }, noteGameBest: Number(read(NOTE_GAME_KEY)) || 0, lipRollAccuracy: json(ROLL_KEY) };
    }
    case "about":
      return { level: read(GLOBAL_KEY), levelPages: json(PAGE_KEY) };
    case "voice":
      return json(VOICE_KEY);
  }
}

function writeDoc(kind: UserDocKind, doc: unknown) {
  switch (kind) {
    case "course_notes":
    case "creator":
      write(KEYS[kind][0], JSON.stringify(doc));
      return;
    case "records": {
      const r = doc as Records;
      write(IMPROV_KEY, JSON.stringify(r.improv));
      write(NOTE_GAME_KEY, String(r.noteGameBest));
      if (r.lipRollAccuracy !== null) write(ROLL_KEY, JSON.stringify(r.lipRollAccuracy));
      return;
    }
    case "about": {
      const a = doc as About;
      write(GLOBAL_KEY, a.level);
      write(PAGE_KEY, JSON.stringify(a.levelPages));
      return;
    }
    case "voice":
      write(VOICE_KEY, JSON.stringify(doc));
      return;
  }
}

export function localBackend(kind: UserDocKind): DocBackend {
  return {
    load: async () => readDoc(kind),
    save: (doc) => writeDoc(kind, doc),
    watch(changed) {
      if (typeof window === "undefined") return () => {};
      const on = (e: StorageEvent) => {
        if (e.key !== null && KEYS[kind].includes(e.key)) changed();
      };
      window.addEventListener("storage", on);
      return () => window.removeEventListener("storage", on);
    },
  };
}
