"use client";

import { useState, type ReactNode } from "react";
import type { PropDoc } from "@/features/exercises/docs";
import { BackingTrack } from "@/features/backing";
import { DEFAULT_DRONE, DroneControls, Jam, PocketTools, PracticeBacking, PracticeBand, clampDrone, type BandPart, type DroneParams } from "@/features/instruments";
import type { Props, Story } from "./stories";

/*
 * The stories for components that are not AI tools: a component takes React props, so each group documents its own and
 * renders them itself. The players play real sound and share their saves with the real pages (`musickit.pocket`,
 * `musickit.jam`, `musickit.backing`, `musickit.practiceBand`).
 */

/** One entry in the sidebar's Components section. */
export interface UiGroup {
  id: string;
  title: string;
  doc: { description: string; props: PropDoc[] };
  stories: Story[];
  render: (props: Props) => ReactNode;
  shape?: undefined;
  shapeDoc?: undefined;
}

const KEY_PC: PropDoc = { name: "keyPc", type: "0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11", required: true, description: "The page's key as a pitch class, 0 = C; the drone and bass sit on it." };
const hand = (name: string, props: Props): Story => ({ name, props, from: "hand" });
const keyOf = (props: Props) => (typeof props.keyPc === "number" ? props.keyPc : 0);

/** DroneControls owns no state: this host keeps the value, as the looper and the pocket tools do. */
function DroneControlsStory({ value, playing }: { value: Partial<DroneParams>; playing: boolean }) {
  const [drone, setDrone] = useState(() => clampDrone(value));
  return <DroneControls value={drone} playing={playing} onChange={(p) => setDrone((d) => clampDrone(p === DEFAULT_DRONE ? p : { ...d, ...p }))} />;
}

const BAND_PARTS: BandPart[] = ["click", "drone", "drums", "bass"];
const partsOf = (props: Props, fallback: BandPart[]): BandPart[] => {
  const list = Array.isArray(props.parts) ? props.parts.filter((p): p is BandPart => BAND_PARTS.includes(p as BandPart)) : [];
  return list.length ? list : fallback;
};
const bpmOf = (props: Props) => (typeof props.bpm === "number" ? props.bpm : 80);
const BAND_PROPS: PropDoc[] = [
  { name: "bpm", type: "number", required: true, description: "The tempo the host sets; it wins over the save on every mount." },
  KEY_PC,
  { name: "parts", type: `("click" | "drone" | "drums" | "bass")[]`, required: true, description: "The parts that play." },
];

/** PracticeBacking has no play button of its own: this host keeps `on`, as the staff does beside its mic. */
function PracticeBackingStory({ bpm, keyPc, parts }: { bpm: number; keyPc: number; parts: BandPart[] }) {
  const [on, setOn] = useState(false);
  return <PracticeBacking bpm={bpm} keyPc={keyPc} parts={parts} on={on} onToggle={() => setOn((v) => !v)} onStop={() => setOn(false)} />;
}

export const UI_GROUPS: UiGroup[] = [
  {
    id: "pocket-tools",
    title: "PocketTools",
    doc: {
      description: "The play-along band in a page's settings bar: click, drone, drums and bass on one clock. Audio starts on the first press.",
      props: [
        KEY_PC,
        { name: "stacked", type: "boolean", required: false, description: "One line per tool at every width, for the narrow side column." },
        { name: "withDrone", type: "boolean", required: false, description: "The drone's line, on unless false." },
        { name: "clickAlways", type: "boolean", required: false, description: "The click starts, muted, on the first press anywhere on the page." },
      ],
    },
    stories: [
      hand("In C", { keyPc: 0 }),
      hand("Stacked, for the side column", { keyPc: 0, stacked: true }),
      hand("Without the drone", { keyPc: 7, withDrone: false }),
    ],
    render: (props) => {
      const stacked = props.stacked === true;
      const tools = <PocketTools keyPc={keyOf(props)} stacked={stacked} withDrone={props.withDrone !== false} clickAlways={props.clickAlways === true} />;
      // the side column's width (22rem, less its padding), so the story shows what the page shows
      return stacked ? <div className="max-w-80">{tools}</div> : tools;
    },
  },
  {
    id: "drone-controls",
    title: "DroneControls",
    doc: {
      description: "The note and sound of a drone: the panel behind the pocket drone's sliders button, also in the looper's drone window. It has no play button and no audio here.",
      props: [
        { name: "value", type: "Partial<DroneParams>", required: false, description: "The starting settings; the rest come from the default drone." },
        { name: "playing", type: "boolean", required: false, description: "Makes the pictures move." },
      ],
    },
    stories: [
      hand("Default", {}),
      hand("Moving pictures", { playing: true }),
      hand("A square wave, band-pass, pitch wobble", { playing: true, value: { root: 9, wave: "square", filter: "bandpass", mod: "pitch", modRate: 2 } }),
    ],
    render: (props) => <DroneControlsStory value={(props.value ?? {}) as Partial<DroneParams>} playing={props.playing === true} />,
  },
  {
    id: "practice-band",
    title: "PracticeBand",
    doc: {
      description: "A folded play-along band for a plan exercise (the click-drone and backing-band tools): one Play for the chosen parts on one clock, a chip per part, tempo and key. Own JamRig.",
      props: [
        ...BAND_PROPS,
        { name: "more", type: "boolean", required: false, description: "The \"More\" fold (tempo slider, drone octave, patterns); false hides it and plays the defaults." },
      ],
    },
    stories: [
      hand("Click and drone in A", { bpm: 80, keyPc: 9, parts: ["click", "drone"] }),
      hand("Full band in E", { bpm: 96, keyPc: 4, parts: ["click", "drone", "drums", "bass"] }),
      hand("Click only, no More", { bpm: 60, keyPc: 0, parts: ["click"], more: false }),
    ],
    render: (props) => <PracticeBand bpm={bpmOf(props)} keyPc={keyOf(props)} parts={partsOf(props, ["click", "drone"])} more={props.more !== false} />,
  },
  {
    id: "practice-backing",
    title: "PracticeBacking",
    doc: {
      description: "The practice band's parts with no part chips, started by its host (the staff's Play beside the mic): shows what plays, mutes and beat dots. Same JamRig and save as PracticeBand. Its on / onToggle / onStop are kept by this story's host.",
      props: BAND_PROPS,
    },
    stories: [
      hand("Drone and click in D", { bpm: 70, keyPc: 2, parts: ["drone", "click"] }),
      hand("Drone only", { bpm: 70, keyPc: 9, parts: ["drone"] }),
      hand("Click only", { bpm: 100, keyPc: 0, parts: ["click"] }),
    ],
    render: (props) => <PracticeBackingStory bpm={bpmOf(props)} keyPc={keyOf(props)} parts={partsOf(props, ["drone", "click"])} />,
  },
  {
    id: "jam",
    title: "Jam",
    doc: {
      description: "The /theory/metronome-drone player: metronome, drone, drums and bass on one JamRig clock, plus recorded loops. No props; saved in musickit.jam.",
      props: [],
    },
    stories: [hand("Default", {})],
    render: () => <Jam />,
  },
  {
    id: "backing-track",
    title: "BackingTrack",
    doc: {
      description: "The /theory/backing player: drums, bass and keys arranged from a chord progression, key and style (features/backing Band, its own clock). No props; saved in musickit.backing.",
      props: [],
    },
    stories: [hand("Default", {})],
    render: () => <BackingTrack />,
  },
];
