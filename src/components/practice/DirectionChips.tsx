"use client";

import { Chip } from "@/components/ui";

/** Every way two notes can go, with one name and one arrow on every page. */
export const DIRECTIONS = {
  up: { label: "Rising", mark: "↗" },
  down: { label: "Falling", mark: "↘" },
  together: { label: "Together", mark: "≡" },
  both: { label: "Both", mark: "↕" },
} as const;

export type DirectionId = keyof typeof DIRECTIONS;

/** The Direction chips: an arrow and a name each, for the directions a tool offers. */
export function DirectionChips<D extends DirectionId>({ options, value, onChange }: { options: readonly D[]; value: D; onChange: (d: D) => void }) {
  return (
    <>
      {options.map((d) => (
        <Chip key={d} on={value === d} onClick={() => onChange(d)}>
          <span aria-hidden>{DIRECTIONS[d].mark}</span> {DIRECTIONS[d].label}
        </Chip>
      ))}
    </>
  );
}
