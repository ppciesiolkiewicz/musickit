"use client";

import type { ReactNode } from "react";
import { Chip, ChipRow } from "@/components/ui";
import { BarRow } from "@/components/chordKit/ScaleSettings";
import { LIP_ROLL_PLAYS, LIP_ROLL_SPEEDS, type LipRollPlay, type LipRollSpeed } from "./glide";
import type { LipRollProps } from "./lip-roll.props";

export type LipRollShape = NonNullable<LipRollProps["shape"]>;

/** The slides a page offers, with their chip labels. */
export const LIP_ROLL_SHAPES: { id: LipRollShape; label: string; title: string }[] = [
  { id: "down", label: "Slide down", title: "From head voice down to chest voice" },
  { id: "siren", label: "Siren", title: "From chest voice up to head voice and back" },
  { id: "hold", label: "One note", title: "One steady chest-voice note" },
];

const PLAY_CHIPS: Record<LipRollPlay, { label: string; title: string }> = {
  always: { label: "With the tone", title: "The tone plays the whole time and you lip roll with it" },
  echo: { label: "Tone, then you", title: "A pass with the tone, then the same pass on your own" },
  silent: { label: "No tone", title: "Follow the line on your own, no tone" },
};
const SPEED_CHIPS: Record<LipRollSpeed, string> = { slow: "Slow", medium: "Medium", fast: "Fast" };

/**
 * The lip roll's choices (Slide, Tone, Speed) for a page that holds them. `look` says where they are drawn: "bar" as
 * rows of a settings bar or side column (`ScaleSettingsBar`'s `rows`), "rows" as labelled chip rows in the page.
 * Speed is left out for One note, which has no slide to pace.
 */
export function LipRollSettings({ shape, onShape, play, onPlay, speed, onSpeed, look = "bar" }: {
  shape: LipRollShape; onShape: (s: LipRollShape) => void;
  play: LipRollPlay; onPlay: (p: LipRollPlay) => void;
  speed: LipRollSpeed; onSpeed: (s: LipRollSpeed) => void;
  look?: "bar" | "rows";
}) {
  const Row = look === "bar" ? BarRow : ChipRow;
  const row = (label: string, chips: ReactNode) => <Row label={label}>{chips}</Row>;
  return (
    <>
      {row("Slide", LIP_ROLL_SHAPES.map((x) => <Chip key={x.id} on={x.id === shape} onClick={() => onShape(x.id)} title={x.title}>{x.label}</Chip>))}
      {row("Tone", LIP_ROLL_PLAYS.map((m) => <Chip key={m} on={m === play} onClick={() => onPlay(m)} title={PLAY_CHIPS[m].title}>{PLAY_CHIPS[m].label}</Chip>))}
      {shape !== "hold" && row("Speed", LIP_ROLL_SPEEDS.map((s) => <Chip key={s} on={s === speed} onClick={() => onSpeed(s)}>{SPEED_CHIPS[s]}</Chip>))}
    </>
  );
}
