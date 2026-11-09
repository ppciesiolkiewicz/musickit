"use client";

import Icon from "@/components/Icon";
import { Select } from "@/components/ui";
import type { KeyChoice } from "@/features/creator";
import { FAMILIES, TONICS, shortModeName } from "@/features/theory";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { followMaster, isKeyed, withOwnKey, type Subject } from "../model/subject";
import { FAMILIES as WIDGET_FAMILIES, updateSubject } from "../model/families";
import { toolKey } from "../model/toolKey";

/** the Scale family's scale choices (every mode, every pentatonic), for a scale-neck's own scale tag */
const SCALE_CONTROL = WIDGET_FAMILIES.find((f) => f.id === "scale")!.controls.find((c) => c.name === "scale")!;
const SCALE_SLUGS = SCALE_CONTROL.options!.map((o) => ({ value: String(o.value), label: o.label }));

/** a family and a mode as one select value: family 1, mode 4 is 104 */
const SCALE_GROUPS = FAMILIES.map((f, family) => ({ label: f.label, options: f.names.map((n, mode) => ({ value: family * 100 + mode, label: shortModeName(n) })) }));
const TONIC_OPTIONS = TONICS.map((t) => ({ value: t.pc, label: t.name }));

/**
 * The widget's own key and scale as two tags in its top-left corner, on hover (`data-chrome`: never in a recording). Changing one pins
 * it on this widget, so the master Key & scale leaves it alone; a pinned widget gets a Follow button to go back to the master. A tool
 * widget shows its root only (its scale is its family's choice, never the master's), except a Scale widget, whose scale tag sets its own scale.
 */
export default function KeyTags({ subject, master, onChange }: { subject: Subject; master: KeyChoice; onChange: (s: Subject) => void }) {
  // a tool widget's key is a root on the tool (none for chord shapes); its scale is its own, so it shows the root tag only
  const toolRoot = subject.kind === "tool" ? toolKey(subject.tool) : null;
  const key: KeyChoice | null = isKeyed(subject) ? subject.key : toolRoot !== null ? { ...master, tonicPc: toolRoot } : null;
  if (!key) return null;
  const pinned: readonly string[] = ("pinned" in subject ? subject.pinned : undefined) ?? [];
  const scaleTag = isKeyed(subject) && subject.kind !== "band";
  const set = (k: KeyChoice) => onChange(withOwnKey(subject, k));
  return (
    <div
      data-chrome
      className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select size="2xs" pill aria-label="This widget's root note" title={pinned.includes("tonic") ? "Root set on this widget" : "Root from Key & scale"}
        highlighted={pinned.includes("tonic")} value={key.tonicPc ?? DEFAULT_KEY_PC} options={TONIC_OPTIONS} onChange={(tonicPc) => set({ ...key, tonicPc })} />
      {scaleTag && (
        <Select size="2xs" pill aria-label="This widget's scale" title={pinned.includes("scale") ? "Scale set on this widget" : "Scale from Key & scale"}
          highlighted={pinned.includes("scale")} value={key.family * 100 + key.mode} groups={SCALE_GROUPS} onChange={(v) => set({ ...key, family: Math.floor(v / 100), mode: v % 100 })} />
      )}
      {subject.kind === "tool" && subject.tool.type === "scale-neck" && (
        <Select size="2xs" pill aria-label="This widget's scale" title="Scale of this widget" value={subject.tool.scale} options={SCALE_SLUGS}
          onChange={(scale) => onChange(updateSubject(subject, { scale }))} />
      )}
      {pinned.length > 0 && (
        <button type="button" onClick={() => onChange(followMaster(subject, master))} title="Follow Key & scale again" aria-label="Follow Key & scale again"
          className="flex h-4 items-center gap-0.5 rounded-full bg-slate-950/80 px-1.5 text-[10px] text-slate-300 ring-1 ring-slate-700 hover:text-slate-100">
          <Icon name="rotate-ccw" size={10} /> Follow
        </button>
      )}
    </div>
  );
}
