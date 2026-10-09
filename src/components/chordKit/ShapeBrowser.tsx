"use client";

import { useMemo, useState, type ReactNode } from "react";
import ShapeCard, { type Placement } from "./ShapeCard";
import { Chip, ChipRow, Section } from "@/components/ui";
import {
  FAMILY_LABEL, FAMILY_ORDER, STRING_NAMES, STRING_ORDER, STYLE_TAGS, groupByShape, matchesTags, placedDegrees, tagCount, tagText,
  type Entry,
} from "@/lib/chordKit/shapeTools";
import { MODE_LIST, type KeyContext } from "@/features/theory/theory";

interface Props {
  entries: Entry[];
  ctx?: KeyContext;
  /** extra controls rendered above the tag rows (key and mode pickers) */
  header?: ReactNode;
  emptyHint?: string;
  /** a degree tag chosen elsewhere (the chord strip) */
  forcedTags?: string[];
}

const ROW_HELP: Record<string, string> = {
  Difficulty: "How hard the fingering is, worked out from the shape itself: how many frets it spans, whether it needs a barre, whether strings are skipped, and how many different frets are used. Easy shapes fit in about two frets. Tap to include or exclude. The number on each chip is how many shapes you would get by choosing it.",
  Style: "The kinds of music a shape is typically used in, such as jazz comping, funk or soul. It is a guide, not a rule: any shape can be played in any style.",
  Shape: "How the shape is built. Barre uses one finger across several strings, compact keeps the fingers close together, shell is only root, 3rd and 7th, drop 3 skips a string above the bass, and top 4 uses the four highest strings.",
  Mode: "Shows shapes whose notes all belong to a mode, counting the mode from the chord's own root. Choosing Dorian shows every chord that sounds natural over a Dorian scale on its root. A chord can fit several modes at once.",
  Degree: "The position of the chord in the key, as a Roman numeral. Capitals are major (IV), lower case is minor (ii), ° is diminished, + is augmented, ♭ means the root is lowered relative to the major scale (♭VII).",
};

/** Tag filters + root-string / chord-type sections + one card per shape. Shared by the Shapes and In key tabs. */
export default function ShapeBrowser({ entries, ctx, header, forcedTags = [] }: Props) {
  const [selected, setSelected] = useState<string[]>(["x:easy", "x:medium"]);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const active = useMemo(() => [...selected, ...forcedTags.filter((t) => !selected.includes(t))], [selected, forcedTags]);

  const toggle = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const flip = (id: string) =>
    setClosed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allTags = useMemo(() => [...new Set(entries.flatMap((e) => e.shape.tags))], [entries]);
  const styleTags = STYLE_TAGS.filter((t) => allTags.includes(t));
  const formTags = allTags.filter((t) => !STYLE_TAGS.includes(t));
  const presentModes = new Set(entries.flatMap((e) => [e.mode, ...e.shape.fit]));
  const modeTags = MODE_LIST.map((m) => m.name).filter((m) => presentModes.has(m)).map((m) => "m:" + m);
  const degreeTags = ctx ? [...new Set(ctx.chords.map((c) => c.roman))].map((r) => "d:" + r) : [];

  const row = (label: string, tags: string[]) => (
    <ChipRow label={label} info={ROW_HELP[label]}>
      {tags.map((t) => (
        <Chip key={t} on={active.includes(t)} onClick={() => toggle(t)} count={tagCount(entries, t, active)}>
          {tagText(t)}
        </Chip>
      ))}
    </ChipRow>
  );

  const shown = entries.filter((e) => matchesTags(e, active));
  const groups = groupByShape(shown);
  const total = new Set(entries.map((e) => e.shape.id)).size;

  const allIds = STRING_ORDER.flatMap((rs) => [`s${rs}`, ...FAMILY_ORDER.map((f) => `s${rs}${f}`)]);
  const collapseAll = () => setClosed(new Set(allIds));
  const expandAll = () => setClosed(new Set());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        {header}
        {row("Difficulty", ["x:easy", "x:medium", "x:hard"])}
        {row("Style", styleTags)}
        {row("Shape", formTags)}
        {row("Mode", modeTags)}
        {degreeTags.length > 0 && row("Degree", degreeTags)}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
          <span>
            <b className="text-slate-200">{groups.length}</b> shape{groups.length === 1 ? "" : "s"} match (of {total})
            {ctx && <>, playing <b className="text-slate-200">{shown.length}</b> chord{shown.length === 1 ? "" : "s"} in {ctx.names[0]} {ctx.modeName}</>}
          </span>
          <button type="button" className="text-sky-300 hover:underline" onClick={() => setSelected([])}>Clear tags</button>
          <button type="button" className="text-sky-300 hover:underline" onClick={collapseAll}>Collapse all</button>
          <button type="button" className="text-sky-300 hover:underline" onClick={expandAll}>Expand all</button>
        </div>
      </div>

      {groups.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No shapes match these tags. Deselect a tag to widen the search.</p>}

      {STRING_ORDER.map((rs) => {
        const list = groups.filter((g) => g.shape.rs === rs);
        if (!list.length) return null;
        const id1 = `s${rs}`;
        return (
          <Section key={rs} title={`Root on the ${STRING_NAMES[rs]}`} meta={`${list.length} shape${list.length === 1 ? "" : "s"}`} open={!closed.has(id1)} onToggle={() => flip(id1)}>
            <div className="flex flex-col gap-3">
              {FAMILY_ORDER.map((fam) => {
                const sub = list.filter((g) => g.shape.fam === fam).sort((a, b) => a.firstDegree - b.firstDegree || a.shape.id - b.shape.id);
                if (!sub.length) return null;
                const id2 = `s${rs}${fam}`;
                return (
                  <Section key={fam} level={2} title={FAMILY_LABEL[fam]} meta={String(sub.length)} open={!closed.has(id2)} onToggle={() => flip(id2)}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sub.map((g) => (
                        <ShapeCard
                          key={g.shape.id}
                          shape={g.shape}
                          selectedTags={active}
                          onToggleTag={toggle}
                          placements={ctx ? g.entries.map((e): Placement => ({
                            name: ctx.names[e.degree ?? 0] + g.shape.suf,
                            roman: e.roman,
                            mode: e.mode,
                            rootPc: e.rootPc!,
                            degrees: placedDegrees(g.shape, e.rootPc!, ctx),
                          })) : undefined}
                        />
                      ))}
                    </div>
                  </Section>
                );
              })}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
