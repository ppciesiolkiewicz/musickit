"use client";

import { Chip, ChipRow } from "@/components/ui";
import { FAMILIES, shortModeName, TONICS } from "@/features/theory/theory";

export function KeyPicker({ tonicPc, onTonic }: { tonicPc: number; onTonic: (pc: number) => void }) {
  return (
    <ChipRow label="Key" info="The home note of the music. Every chord and note below is worked out relative to it, so changing the key moves everything to match, and spells notes correctly (F♯ in G major, not G♭).">
      {TONICS.map((t) => (
        <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
      ))}
    </ChipRow>
  );
}

export function ModePicker({ familyIndex, modeIndex, onChange }: { familyIndex: number; modeIndex: number; onChange: (family: number, mode: number) => void }) {
  return (
    <>
      <ChipRow label="Scale family" info="Modes come in three families, named after the scale they are rotations of: the major scale, harmonic minor and melodic minor. Each family has seven modes, one starting on each note of the parent scale.">
        {FAMILIES.map((f, i) => (
          <Chip key={f.id} on={i === familyIndex} onClick={() => onChange(i, 0)}>{f.label}</Chip>
        ))}
      </ChipRow>
      <ChipRow label="Mode" info="A mode is a scale built by starting the parent scale on a different note. Dorian, for example, is the major scale started on its 2nd note. Same notes, different home, so a different mood. The mood and use are shown above the chords.">
        {FAMILIES[familyIndex].names.map((n, i) => (
          <Chip key={n} on={i === modeIndex} onClick={() => onChange(familyIndex, i)}>{shortModeName(n)}</Chip>
        ))}
      </ChipRow>
    </>
  );
}
