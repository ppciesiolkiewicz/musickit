import { parseBlock } from "@/features/plan/model/config";
import type { Block } from "@/features/plan/model/types";

/**
 * Where the notes creator keeps its note. Every load and save goes through this, so an API store (a signed-in teacher's notes
 * in the database) can take the browser's place without touching a component. Async on purpose, for that day.
 */
export interface NoteStore {
  /** the saved note, or null when there is none (or it can't be read) */
  load(): Promise<Block | null>;
  save(block: Block): Promise<void>;
}

export const NOTE_KEY = "musickit.note";

/** The note in this browser's localStorage. */
export const localNoteStore: NoteStore = {
  async load() {
    try {
      const raw = window.localStorage.getItem(NOTE_KEY);
      return raw ? parseBlock(JSON.parse(raw), { draft: true }).block : null;
    } catch {
      return null;
    }
  },
  async save(block) {
    try {
      window.localStorage.setItem(NOTE_KEY, JSON.stringify(block));
    } catch {
      /* storage unavailable: the note lives for this visit only */
    }
  },
};
