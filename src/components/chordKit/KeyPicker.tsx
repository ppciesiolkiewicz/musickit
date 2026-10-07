"use client";

import { Chip, ChipRow } from "./ui";
import { FAMILIES, shortModeName, TONICS } from "@/lib/chordKit/theory";

export function KeyPicker({ tonicPc, onTonic }: { tonicPc: number; onTonic: (pc: number) => void }) {
  return (
    <ChipRow label="Key">
      {TONICS.map((t) => (
        <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
      ))}
    </ChipRow>
  );
}

export function ModePicker({ familyIndex, modeIndex, onChange }: { familyIndex: number; modeIndex: number; onChange: (family: number, mode: number) => void }) {
  return (
    <>
      <ChipRow label="Scale family">
        {FAMILIES.map((f, i) => (
          <Chip key={f.id} on={i === familyIndex} onClick={() => onChange(i, 0)}>{f.label}</Chip>
        ))}
      </ChipRow>
      <ChipRow label="Mode">
        {FAMILIES[familyIndex].names.map((n, i) => (
          <Chip key={n} on={i === modeIndex} onClick={() => onChange(familyIndex, i)}>{shortModeName(n)}</Chip>
        ))}
      </ChipRow>
    </>
  );
}
