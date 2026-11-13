"use client";

import type { ReactNode } from "react";
import { Chip, DropdownSection, SettingsRow } from "@/components/ui";
import type { VoiceHillProps } from "./voice-hill.props";

export type HillPlace = NonNullable<VoiceHillProps["where"]>;
export type HillSoundChoice = NonNullable<VoiceHillProps["sound"]>;

/** The places a page offers, with their chip labels and the hold length and count that suit each. */
export const HILL_PLACES: { id: HillPlace; label: string; title: string; props: VoiceHillProps }[] = [
  { id: "low", label: "Low", title: "The bottom of your voice, a little lower each hold", props: { where: "low" } },
  { id: "middle", label: "Middle", title: "The middle of your voice, between two marks", props: { where: "middle", seconds: 5, reps: 3 } },
  { id: "high", label: "High", title: "Head voice, light and soft", props: { where: "high", seconds: 2 } },
];

const SOUNDS: { id: HillSoundChoice; label: string }[] = [
  { id: "hum", label: "Hum" },
  { id: "oo", label: "“oo”" },
  { id: "ee", label: "“ee”" },
];

/**
 * The hill's choices (Place, Sound) for a page that holds them. `look` says where they are drawn: "bar" as rows of a
 * page's `SettingsPanel`, "menu" as sections of a sliders button.
 */
export function HillSettings({ place, onPlace, sound, onSound, look = "bar" }: {
  place: HillPlace; onPlace: (p: HillPlace) => void;
  sound: HillSoundChoice; onSound: (s: HillSoundChoice) => void;
  look?: "bar" | "menu";
}) {
  const row = (label: string, chips: ReactNode) => look === "bar"
    ? <SettingsRow label={label}>{chips}</SettingsRow>
    : <DropdownSection title={label}><div className="flex flex-wrap gap-1.5">{chips}</div></DropdownSection>;
  return (
    <>
      {row("Place", HILL_PLACES.map((x) => <Chip key={x.id} on={x.id === place} onClick={() => onPlace(x.id)} title={x.title}>{x.label}</Chip>))}
      {row("Sound", SOUNDS.map((x) => <Chip key={x.id} on={x.id === sound} onClick={() => onSound(x.id)}>{x.label}</Chip>))}
    </>
  );
}
