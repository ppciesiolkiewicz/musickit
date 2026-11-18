import { isOpen, partsOf } from "@/features/plan/model/choice";
import type { Choice } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";

/**
 * What a seed exercise written to the current rules must not hold (ChoiceSplit): a choice with chips that sets a key
 * or a tempo (that is `moves` on the exercise now), and, in an exercise with `moves`, any mention of a selector (the
 * app draws it and writes its line). `seed check` runs this only for a file at the current versions, so an older
 * file, still read in the older shape, is not failed by it.
 */
export function movesProblems(e: Pick<Block, "title" | "choice" | "moves" | "cells">, where: string): string[] {
  const out: string[] = [];
  const sets = (c: Choice | undefined) => !!c && !isOpen(c) && partsOf(c).some((p) => p === "key" || p === "bpm");
  if (sets(e.choice)) out.push(`${where}: the block's choice sets a key or a tempo; state "moves" on the exercise instead.`);
  for (const c of e.cells) if (c.type === "section" && sets(c.choice)) out.push(`${where}: the choice of "${c.heading}" sets a key or a tempo; state "moves" on the exercise instead.`);
  if (e.moves) {
    const texts = [e.title, ...e.cells.flatMap((c) => (c.type === "section" ? [c.heading, ...c.cells.flatMap(textsOf)] : textsOf(c)))];
    if (texts.some((t) => /\bselector\b/i.test(t))) out.push(`${where}: the text mentions a selector, but an exercise with moves gets its selector and the line about it from the app.`);
  }
  return out;
}

const textsOf = (c: { type: string; text?: string; items?: string[] }): string[] => (c.type === "text" && c.text ? [c.text] : c.type === "list" && c.items ? c.items : []);
