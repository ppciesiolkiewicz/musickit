"use client";

import { useState, type ReactNode } from "react";
import type { PropDoc } from "@/features/exercises/docs";
import { DEFAULT_DRONE, DroneControls, PocketDrone, PocketTools, clampDrone, type DroneParams } from "@/features/instruments";
import type { Props, Story } from "./stories";

/*
 * The stories for components that are not AI tools: a component takes React props, so each group documents its own and
 * renders them itself. The pocket tools play real sound and share their save with the real pages (`musickit.pocket`).
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
    id: "pocket-tools-drone",
    title: "PocketDrone",
    doc: {
      description: "The drone's line of the pocket tools on its own: play, mute, octave, volume, and the full drone controls behind the sliders button.",
      props: [KEY_PC],
    },
    stories: [hand("In E", { keyPc: 4 }), hand("In A", { keyPc: 9 })],
    render: (props) => <PocketDrone keyPc={keyOf(props)} />,
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
];
