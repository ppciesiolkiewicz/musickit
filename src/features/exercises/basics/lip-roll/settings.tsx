"use client";

import type { ReactNode } from "react";
import { Chip, DropdownSection, SettingsRow } from "@/components/ui";
import { PlayAheadRow } from "@/features/settings";
import { RollAccuracy } from "../warmUpBar";
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
 * The lip roll's choices (Slide, Tone, Speed, Accuracy, Play-ahead): in a page's settings panel, or under the tool's own
 * sliders button in the plan. `look` says where they are drawn: "bar" as
 * rows of a page's `SettingsPanel`, "menu" as sections of a sliders button.
 * Speed is left out for One note, which has no slide to pace. Accuracy and Play-ahead are saved for the app, so the tool
 * reads the same values.
 */
export function LipRollSettings({ shape, onShape, play, onPlay, speed, onSpeed, look = "bar" }: {
  shape: LipRollShape; /** none: the slide is fixed (an exercise in the plan), so no Slide row */ onShape?: (s: LipRollShape) => void;
  play: LipRollPlay; onPlay: (p: LipRollPlay) => void;
  speed: LipRollSpeed; onSpeed: (s: LipRollSpeed) => void;
  look?: "bar" | "menu";
}) {
  const row = (label: string, chips: ReactNode) => look === "bar"
    ? <SettingsRow label={label}>{chips}</SettingsRow>
    : <DropdownSection title={label}><div className="flex flex-wrap gap-1.5">{chips}</div></DropdownSection>;
  return (
    <>
      {onShape && row("Slide", LIP_ROLL_SHAPES.map((x) => <Chip key={x.id} on={x.id === shape} onClick={() => onShape(x.id)} title={x.title}>{x.label}</Chip>))}
      {row("Tone", LIP_ROLL_PLAYS.map((m) => <Chip key={m} on={m === play} onClick={() => onPlay(m)} title={PLAY_CHIPS[m].title}>{PLAY_CHIPS[m].label}</Chip>))}
      {shape !== "hold" && row("Speed", LIP_ROLL_SPEEDS.map((s) => <Chip key={s} on={s === speed} onClick={() => onSpeed(s)}>{SPEED_CHIPS[s]}</Chip>))}
      <RollAccuracy look={look} />
      <PlayAheadRow look={look} />
    </>
  );
}
