"use client";

import type { ReactNode } from "react";
import { Chip, DropdownSection, SettingsRow } from "@/components/ui";
import { INTERVALS } from "@/lib/chordKit/intervals";
import { EAR_LEVELS, activeAnswers, levelSemis, type Direction, type EarSettings } from "@/lib/practice/earGame";
import { DirectionChips } from "./DirectionChips";

const DIRS: Direction[] = ["up", "down", "together"];
const ONE_TO_TWELVE = INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12);

/**
 * The ear game's own settings for intervals (Level, Intervals, Span, Direction); chord quality has none. Controlled:
 * `settings` and `onChange(patch)` are the host's. `look`: "bar" rows of a page's `SettingsPanel`, "menu" sections of a
 * sliders button.
 */
export function EarGameSettings({ settings: s, onChange, look = "bar" }: { settings: EarSettings; onChange: (patch: Partial<EarSettings>) => void; look?: "bar" | "menu" }) {
  if (s.kind !== "interval") return null;
  const answers = activeAnswers(s);
  const toggleCustom = (semis: number) => {
    const cur = s.custom ?? levelSemis(s.level);
    const set = cur.includes(semis) ? cur.filter((x) => x !== semis) : [...cur, semis];
    if (set.length) onChange({ custom: set });
  };
  // the first Custom starts from the level it came from
  const pickCustom = () => {
    if (!s.custom) onChange({ custom: levelSemis(s.level) });
  };
  const row = (label: string, info: string, chips: ReactNode) => look === "bar"
    ? <SettingsRow label={label} info={info}>{chips}</SettingsRow>
    : <DropdownSection title={label} info={info}><div className="flex flex-wrap gap-1.5">{chips}</div></DropdownSection>;
  return (
    <>
      {row("Level", "Each level adds intervals to the ones before. Start with the 5th and octave, the most open sounds, then the 3rds that make chords major or minor. Custom lets you pick your own.", <>
        {EAR_LEVELS.map((l) => <Chip key={l.n} on={!s.custom && s.level === l.n} onClick={() => onChange({ level: l.n, custom: null })} title={l.label}>{l.n}</Chip>)}
        <Chip on={!!s.custom} onClick={pickCustom}>Custom</Chip>
      </>)}
      {row("Intervals", "The intervals the questions use. Pick Custom to choose them yourself: when two keep getting mixed up, train only those two. m is minor, M is major, P is perfect and TT is the tritone.",
        ONE_TO_TWELVE.filter((i) => s.custom || answers.includes(i.short)).map((i) => (
          <Chip key={i.semis} disabled={!s.custom} on={answers.includes(i.short)} onClick={() => toggleCustom(i.semis)}
            title={!s.custom ? `The ${i.name}: pick Custom to change the set` : answers.includes(i.short) ? (answers.length > 1 ? `Leave out the ${i.name}` : "At least one interval") : `Ask the ${i.name} too`}>{i.short}</Chip>
        )))}
      {row("Span", "Within an octave, or sometimes an octave wider (a 9th for a 2nd). Wider is harder: answer with the simple interval name.", <>
        <Chip on={!s.wide} onClick={() => onChange({ wide: false })}>Within an octave</Chip>
        <Chip on={s.wide} onClick={() => onChange({ wide: true })}>Multi-octave</Chip>
      </>)}
      {row("Direction", "Rising plays the low note first, Falling plays the high note first, and Together plays both at once.",
        <DirectionChips options={DIRS} value={s.direction} onChange={(direction) => onChange({ direction })} />)}
    </>
  );
}
