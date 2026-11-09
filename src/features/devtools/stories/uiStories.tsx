"use client";

import { useState, type ReactNode } from "react";
import type { PropDoc } from "@/features/exercises/docs";
import { BackingTrack } from "@/features/backing";
import { DEFAULT_DRONE, DroneControls, JamPage, PracticeBand, clampDrone, type BandConfig, type BandView, type DroneParams } from "@/features/instruments";
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

const hand = (name: string, props: Props): Story => ({ name, props, from: "hand" });

/** DroneControls owns no state: this host keeps the value, as the looper and the pocket tools do. */
function DroneControlsStory({ value, playing }: { value: Partial<DroneParams>; playing: boolean }) {
  const [drone, setDrone] = useState(() => clampDrone(value));
  return <DroneControls value={drone} playing={playing} onChange={(p) => setDrone((d) => clampDrone(p === DEFAULT_DRONE ? p : { ...d, ...p }))} />;
}

const BAND_VIEWS: BandView[] = ["full", "pocket", "bar", "inline"];
const viewOf = (props: Props): BandView => (BAND_VIEWS.includes(props.view as BandView) ? (props.view as BandView) : "bar");
const configOf = (props: Props): BandConfig => {
  const c = (props.config ?? {}) as Partial<BandConfig>;
  return { ...c, parts: Array.isArray(c.parts) ? c.parts : ["click", "drone"] };
};

/** The inline view has no play button of its own: this host keeps `on`, as the staff does beside its mic. */
function InlineBandStory({ config }: { config: BandConfig }) {
  const [on, setOn] = useState(false);
  return <PracticeBand view="inline" storageKey="musickit.practiceBand" config={config} on={on} onToggle={() => setOn((v) => !v)} onStop={() => setOn(false)} />;
}

export const UI_GROUPS: UiGroup[] = [
  {
    id: "drone-controls",
    title: "DroneControls",
    doc: {
      description: "The note and sound of a drone: the panel behind the pocket view's drone sliders button, also in the looper's drone window. It has no play button and no audio here.",
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
      description: "The play-along band: click, drone, drums and bass on one JamRig clock, drawn by a view. bar: one folded line for a plan exercise (the backing-band tool), a Play for the chosen parts, a chip per part, tempo and key, and \"More\" for the tempo slider, drone octave, groove and patterns. inline: the parts with no part chips, started by its host (the staff's Play beside the mic; this story's host keeps on / onToggle / onStop). full: the whole band as a page, a card per part with its sound, patterns, groove and levels, and a Play all (Space); the metronome-drone page hosts it on its own rig with loops under it (the JamPage story). pocket: the band in a page's settings bar (the scales pages, the stage), a tall Play all and one line per part with a sliders button for the rest; stacked (a pocket prop) puts one line per tool for the side column. Saved in musickit.practiceBand here; pocket in musickit.pocket, as on the pages.",
      props: [
        { name: "view", type: `"full" | "pocket" | "bar" | "inline"`, required: true, description: "How the band looks. In bar and inline the config's bpm, key and groove win over the save on every mount." },
        { name: "pocket", type: "{ stacked?: boolean, clickAlways?: boolean }", required: false, description: "pocket only: one line per tool for the side column; the click starts, muted, on the first press anywhere on the page." },
        { name: "config", type: "JSON", required: true, description: "{ parts: (\"click\" | \"drone\" | \"drums\" | \"bass\")[], bpm?, keyPc? (0 = C), groove? (pop, rock, ballad, swing, shuffle, bossa, funk, reggae), droneOctave?, show? (single flags over the view's, e.g. { more: false }) }" },
      ],
    },
    stories: [
      hand("Bar, click and drone in A", { view: "bar", config: { parts: ["click", "drone"], bpm: 80, keyPc: 9 } }),
      hand("Bar, full band in E", { view: "bar", config: { parts: ["click", "drone", "drums", "bass"], bpm: 96, keyPc: 4 } }),
      hand("Bar, drone always, click off", { view: "bar", config: { parts: ["click", "drone"], start: [], locked: ["drone"], bpm: 60, keyPc: 4 } }),
      hand("Bar, click only, no More", { view: "bar", config: { parts: ["click"], bpm: 60, keyPc: 0, show: { more: false } } }),
      hand("Bar, bossa groove", { view: "bar", config: { parts: ["click", "drums", "bass"], bpm: 120, keyPc: 2, groove: "bossa" } }),
      hand("Inline, drone and click in D", { view: "inline", config: { parts: ["drone", "click"], bpm: 70, keyPc: 2 } }),
      hand("Inline, click only", { view: "inline", config: { parts: ["click"], bpm: 100, keyPc: 0 } }),
      hand("Full, the whole band", { view: "full", config: { parts: ["click", "drone", "drums", "bass"] } }),
      hand("Pocket, in C", { view: "pocket", config: { parts: ["click", "drone", "drums", "bass"], keyPc: 0 } }),
      hand("Pocket, stacked for the side column", { view: "pocket", config: { parts: ["click", "drone", "drums", "bass"], keyPc: 0 }, pocket: { stacked: true } }),
      hand("Pocket, the drone alone", { view: "pocket", config: { parts: ["drone"], keyPc: 7 } }),
    ],
    render: (props) => {
      const view = viewOf(props);
      const config = configOf(props);
      if (view === "inline") return <InlineBandStory config={config} />;
      if (view !== "pocket") return <PracticeBand view={view} storageKey="musickit.practiceBand" config={config} />;
      const pocket = (props.pocket ?? {}) as { stacked?: boolean; clickAlways?: boolean };
      const band = <PracticeBand view="pocket" storageKey="musickit.pocket" config={config} pocket={{ stacked: pocket.stacked === true, clickAlways: pocket.clickAlways === true }} />;
      // the side column's width (22rem, less its padding), so the story shows what the page shows
      return pocket.stacked ? <div className="max-w-80">{band}</div> : band;
    },
  },
  {
    id: "jam-page",
    title: "JamPage",
    doc: {
      description: "The /theory/metronome-drone player: the full PracticeBand on a JamRig with a following click, and recorded loops under it on the same clock. No props; saved in musickit.jam.",
      props: [],
    },
    stories: [hand("Default", {})],
    render: () => <JamPage />,
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
