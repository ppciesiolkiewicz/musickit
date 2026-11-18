import { parseNotesStore } from "@/features/course/notes";
import { sanitiseKey } from "@/features/creator/model/key";
import { isRollCents } from "@/features/exercises/basics/rollAccuracy";
import { readLevel, readOverrides } from "@/features/guide/levelStorage";
import type { Level } from "@/features/guide/levels";
import { parseBlock } from "@/features/plan/model/config";
import { fitPlanState, sanitiseState } from "@/features/plan/model/state";
import { savedVoice } from "@/features/theory/singing";
import type { Voice } from "@/features/theory/singing";

/** The documents a player keeps on the server, one row each per player. Pure and client-safe: no `window`. */
export const DOC_KINDS = ["plan", "note", "course_notes", "creator", "records", "about"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const isDocKind = (v: unknown): v is DocKind => typeof v === "string" && (DOC_KINDS as readonly string[]).includes(v);

/** The most a stored document may take, measured as its JSON text. The plan has its own, larger cap. */
export const MAX_DOC_BYTES = 512 * 1024;

/**
 * The plan's cap: the running plan, up to 60 earlier ones and the given plans (a seven-day plan is about 20 to 50 KB, a one-day plan a seventh of that). Past it, the oldest earlier
 * plans are dropped (`fitPlanState`), on the server in `parseDoc` and in the browser before a save, so a save is never refused for it.
 */
export const MAX_PLAN_BYTES = 2 * 1024 * 1024;

/** The cap of one kind of document. */
export const maxDocBytes = (kind: DocKind): number => (kind === "plan" ? MAX_PLAN_BYTES : MAX_DOC_BYTES);

export interface Records {
  improv: { done: number; best: number };
  noteGameBest: number;
  /** The lip roll's accuracy in cents, one of `ROLL_ACCURACIES`; null until the player picks one (the warm-up then uses its default). */
  lipRollAccuracy: number | null;
}

export interface About {
  level: Level;
  levelPages: Record<string, Level>;
  voice: Voice | null;
}

const obj = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** A stored document of this kind made safe, with the feature's own parser. Missing or broken input gives the kind's empty value. */
export function parseDoc(kind: DocKind, raw: unknown): unknown {
  switch (kind) {
    case "plan":
      return fitPlanState(sanitiseState(raw), MAX_PLAN_BYTES);
    case "note": {
      if (typeof raw !== "object" || raw === null) return null;
      return parseBlock(raw, { draft: true }).block;
    }
    case "course_notes":
      return parseNotesStore(typeof raw === "object" || typeof raw === "string" ? raw : null);
    case "creator":
      return sanitiseKey(raw);
    case "records": {
      const r = obj(raw);
      const improv = obj(r.improv);
      return { improv: { done: count(improv.done), best: count(improv.best) }, noteGameBest: count(r.noteGameBest), lipRollAccuracy: isRollCents(r.lipRollAccuracy) ? r.lipRollAccuracy : null } satisfies Records;
    }
    case "about": {
      const a = obj(raw);
      return {
        level: readLevel(typeof a.level === "string" ? a.level : null),
        levelPages: readOverrides(JSON.stringify(obj(a.levelPages))),
        voice: savedVoice(a.voice),
      } satisfies About;
    }
  }
}
