"use client";

import { DropdownSection, Select, SettingsRow } from "@/components/ui";
import { PIANO_SCALES, makeKey, type ScaleId } from "@/features/theory/piano/key";

/**
 * The theory piano's key and scale, spelled as the piano spells them (`makeKey`). Controlled: the host owns both.
 * `look`: "bar" rows of a page's `SettingsPanel`, "menu" sections of a sliders button.
 */
export function PianoSettings({ tonicPc, scale, onChange, look = "bar" }: { tonicPc: number; scale: ScaleId; onChange: (tonicPc: number, scale: ScaleId) => void; look?: "bar" | "menu" }) {
  const key = <Select size="sm" value={tonicPc} onChange={(pc) => onChange(pc, scale)} aria-label="Key" options={Array.from({ length: 12 }, (_, pc) => ({ value: pc, label: makeKey(pc, scale).tonic }))} />;
  const scales = <Select size="sm" value={scale} onChange={(s) => onChange(tonicPc, s)} aria-label="Scale" options={PIANO_SCALES.map((s) => ({ value: s.id, label: s.name }))} />;
  if (look === "menu") return <><DropdownSection title="Key">{key}</DropdownSection><DropdownSection title="Scale">{scales}</DropdownSection></>;
  return <><SettingsRow label="Key">{key}</SettingsRow><SettingsRow label="Scale">{scales}</SettingsRow></>;
}
