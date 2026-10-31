import type { Section } from "./tools";

/** A timed stretch of an exercise: the headings that carry `minutes` start one. `from`/`to` are section indexes, `to` excluded. */
export interface Block { title: string; minutes: number; from: number; to: number }

/** The exercise's timed blocks, in order; [] when no heading has minutes. Sections before the first block belong to block 1; headings without minutes don't start blocks. */
export function blocksOf(sections: Section[]): Block[] {
  const starts = sections.flatMap((s, i) => (s.type === "heading" && s.minutes ? [i] : []));
  return starts.map((at, n) => {
    const h = sections[at] as Extract<Section, { type: "heading" }>;
    return { title: h.text, minutes: h.minutes ?? 1, from: n === 0 ? 0 : at, to: n + 1 < starts.length ? starts[n + 1] : sections.length };
  });
}

/**
 * Scale the blocks' minutes so they add up to `minutes` (largest remainder, every block at least 1). With fewer minutes than
 * blocks, the last blocks lose their minutes and become plain sub-headings. The exercise's own minutes never change.
 */
export function fitBlocks(sections: Section[], minutes: number): { sections: Section[]; changed: boolean } {
  const blocks = blocksOf(sections);
  if (!blocks.length) return { sections, changed: false };
  const kept = blocks.slice(0, Math.max(1, Math.floor(minutes)));
  const total = kept.reduce((n, b) => n + b.minutes, 0);
  if (kept.length === blocks.length && total === minutes) return { sections, changed: false };
  const extra = minutes - kept.length;
  const quota = kept.map((b) => (extra * b.minutes) / total);
  const given = quota.map(Math.floor);
  let left = extra - given.reduce((n, g) => n + g, 0);
  quota.map((q, i) => ({ i, r: q - given[i] })).sort((a, b) => b.r - a.r || a.i - b.i).forEach(({ i }) => {
    if (left-- > 0) given[i]++;
  });
  const out = sections.map((s) => ({ ...s }) as Section);
  blocks.forEach((b, n) => {
    const at = out.findIndex((s, i) => i >= b.from && s.type === "heading" && s.minutes && s.text === b.title);
    const h = out[at] as Extract<Section, { type: "heading" }>;
    if (n < kept.length) h.minutes = 1 + given[n];
    else delete h.minutes;
  });
  return { sections: out, changed: true };
}
