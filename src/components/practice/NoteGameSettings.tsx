"use client";

import type { ReactNode } from "react";
import { Chip, DropdownSection, SettingsRow, Stepper } from "@/components/ui";
import type { NoteSettings } from "@/lib/practice/noteGame";

export const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];

/**
 * The note game's own settings: Strings, Frets, Notes. Controlled: `settings` and `onChange(patch)` are the host's.
 * `look`: "bar" rows of a page's `SettingsPanel`, "menu" sections of a sliders button.
 */
export function NoteGameSettings({ settings: s, onChange, look = "bar" }: { settings: NoteSettings; onChange: (patch: Partial<NoteSettings>) => void; look?: "bar" | "menu" }) {
  const row = (label: string, info: string, controls: ReactNode) => look === "bar"
    ? <SettingsRow label={label} info={info}>{controls}</SettingsRow>
    : <DropdownSection title={label} info={info}><div className="flex flex-wrap gap-1.5">{controls}</div></DropdownSection>;
  return (
    <>
      {row("Strings", "Which strings the questions use. Start with E and A, the roots of most chords, then add the others. The small e is the thin top string.",
        STRING_LETTERS.map((l, i) => (
          <Chip key={l} on={s.strings.includes(i)} onClick={() => onChange({ strings: s.strings.includes(i) ? s.strings.filter((x) => x !== i) : [...s.strings, i].sort((a, b) => a - b) })}>{l}</Chip>
        )))}
      {row("Frets", "The part of the neck the questions use. Frets outside it are dimmed. Keep it small at first, then widen it as it gets easy.", <>
        <Stepper label="From fret" value={`from ${s.from}`} onDec={() => onChange({ from: Math.max(0, s.from - 1) })} onInc={() => onChange({ from: Math.min(s.to, s.from + 1) })} decDisabled={s.from <= 0} incDisabled={s.from >= s.to} />
        <Stepper label="To fret" value={`to ${s.to}`} onDec={() => onChange({ to: Math.max(s.from, s.to - 1) })} onInc={() => onChange({ to: Math.min(15, s.to + 1) })} decDisabled={s.to <= s.from} incDisabled={s.to >= 15} />
      </>)}
      {row("Notes", "Natural notes have no sharp or flat: A B C D E F G. Flat names call a note B♭ instead of A♯. It is the same note with another name.", <>
        <Chip on={s.naturals} onClick={() => onChange({ naturals: !s.naturals })}>Natural notes only</Chip>
        <Chip on={s.flats} onClick={() => onChange({ flats: !s.flats })}>Flat names</Chip>
      </>)}
    </>
  );
}
