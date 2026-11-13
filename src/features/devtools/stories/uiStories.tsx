"use client";

import { useState, type ReactNode } from "react";
import type { PropDoc } from "@/features/exercises/docs";
import AudioDevicesButton, { AudioDevicesPanel } from "@/components/AudioDevicesButton";
import InputChannels, { AppInputChannels } from "@/components/InputChannels";
import InputChip from "@/components/InputChip";
import { useMicPitch, type MicStatus } from "@/components/practice/useMicPitch";
import { BackingTrack } from "@/features/backing";
import type { InputChannel } from "@/features/sound";
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
  /** words the sidebar filter finds it by, beside its id, title and story names */
  keywords: string[];
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

/** InputChannels owns no state: this host keeps the channel, as the studio's sources do. */
function InputChannelsStory({ value, levels }: { value: InputChannel; levels: number[] }) {
  const [channel, setChannel] = useState<InputChannel>(value);
  return <div className="max-w-80"><InputChannels value={channel} onChange={setChannel} levels={levels} /></div>;
}

const MIC_STATUSES: MicStatus[] = ["off", "asking", "on", "denied", "error", "insecure"];

/** The chip as a page uses it: given `live`, this host listens with useMicPitch behind the chip's own mic switch, so the levels and channels move. */
function InputChipStory({ live, status, align, mode }: { live: boolean; status: MicStatus; align: "left" | "right"; mode: "modal" | "popover" }) {
  const [on, setOn] = useState(false);
  const mic = useMicPitch(live && on);
  if (!live) return <InputChip status={status} align={align} mode={mode} />;
  return (
    <div className="flex flex-col items-start gap-2">
      <InputChip status={mic.status} mic={{ on, onToggle: () => setOn((v) => !v) }} align={align} mode={mode} />
      <p className="text-xs text-slate-500">{on ? `Listening: ${mic.status}. Open the chip for the input list and its channels.` : "Press the chip to start the microphone."}</p>
    </div>
  );
}

const channelOf = (v: unknown): InputChannel => (v === "1" || v === "2" ? v : "both");

export const UI_GROUPS: UiGroup[] = [
  {
    id: "input-chip",
    title: "InputChip",
    keywords: ["mic", "microphone", "input", "audio", "level", "device", "chip", "listen"],
    doc: {
      description: "The audio input next to a mic: a mic icon, the chosen input's short name and, while the app listens, a level bar per input (the channel heard brighter). A press opens the input dialog (a modal by default, or a popover under the chip): what the status means, Start / Stop (given mic), the input list with its channels ([Both] [1] [2], AppInputChannels) and the output folded into one row. The choice is the app's one input (musickit.audio.devices), shared with the nav's cog and every page. The live story really opens the microphone.",
      props: [
        { name: "status", type: `"off" | "asking" | "on" | "denied" | "error" | "insecure"`, required: false, description: "The host's listener; a blocked one turns the chip red and says why." },
        { name: "mic", type: "{ on: boolean, onToggle: () => void }", required: false, description: "The host's own mic switch: the chip reads Start microphone while off, and the dialog holds Start / Stop." },
        { name: "mode", type: `"modal" | "popover"`, required: false, description: "How the dialog opens: modal (default) over the page, the whole screen on a phone; popover under the chip." },
        { name: "align", type: `"left" | "right"`, required: false, description: "Which chip edge the popover lines up with." },
        { name: "live", type: "boolean", required: false, description: "Story only: a host that listens with useMicPitch behind the chip's mic switch." },
      ],
    },
    stories: [
      hand("Live, with its own mic switch", { live: true }),
      hand("Shows the input only", { status: "off" }),
      hand("Asking for the mic", { status: "asking" }),
      hand("Blocked", { status: "denied" }),
      hand("No microphone", { status: "error" }),
      hand("Live, as a popover", { live: true, mode: "popover" }),
      hand("Live, popover lined up right", { live: true, mode: "popover", align: "right" }),
    ],
    render: (props) => (
      <InputChipStory
        key={JSON.stringify(props)}
        live={props.live === true}
        status={MIC_STATUSES.find((m) => m === props.status) ?? "off"}
        align={props.align === "right" ? "right" : "left"}
        mode={props.mode === "popover" ? "popover" : "modal"}
      />
    ),
  },
  {
    id: "audio-devices",
    title: "AudioDevicesPanel",
    keywords: ["audio", "devices", "input", "output", "mic", "speaker", "settings", "cog", "interface"],
    doc: {
      description: "The input and output lists with Detect devices, and under the input its channels ([Both] [1] [2], shown for a two-input device): the body of the nav's devices menu (AudioDevicesButton, the cog), of the input chip's dialog and of the studio's Audio input dialog. A press changes the app's real input or output.",
      props: [
        { name: "inputs", type: "boolean", required: false, description: "Show the input list and its channels (default true)." },
        { name: "outputs", type: `boolean | "collapsed"`, required: false, description: "Show the output list; collapsed folds it into one row that opens it (the input chip)." },
        { name: "listening", type: "boolean", required: false, description: "The host's mic is open: lists the devices again, since the browser names them once allowed." },
        { name: "button", type: "boolean", required: false, description: "Story only: render AudioDevicesButton, the nav's cog that opens this panel." },
      ],
    },
    stories: [
      hand("Inputs and outputs", {}),
      hand("Output folded, as in the input chip", { outputs: "collapsed" }),
      hand("Outputs only", { inputs: false }),
      hand("The nav's cog", { button: true }),
    ],
    render: (props) =>
      props.button === true ? (
        <div className="flex min-h-96 justify-end"><AudioDevicesButton /></div>
      ) : (
        <div className="max-w-96 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200">
          <AudioDevicesPanel inputs={props.inputs !== false} outputs={props.outputs === "collapsed" ? "collapsed" : props.outputs !== false} listening={props.listening === true} />
        </div>
      ),
  },
  {
    id: "input-channels",
    title: "InputChannels",
    keywords: ["channel", "input", "audio interface", "level", "mic", "guitar", "voice"],
    doc: {
      description: "Which channel of a two-input device (an audio interface: guitar on Input 1, voice on Input 2) is heard: Both (the default, mixed), 1 or 2, each with its level beside it, and an (i) note on what the channels are for. AppInputChannels is the app's own, under the input list in every devices panel (the nav's cog, an input chip): it reads and sets the app's channel and the live levels, and hides for a one-input device: heard with one channel, named like one mic (MacBook, built-in, webcam, headset), or two channels whose levels stay equal while loud (the browser copying one mic). The system default shows only once its levels differ. The studio's sources with a device of their own use InputChannels with their own channel.",
      props: [
        { name: "value", type: `"both" | "1" | "2"`, required: true, description: "The channel heard." },
        { name: "onChange", type: "(c) => void", required: true, description: "A press on a channel." },
        { name: "levels", type: "number[]", required: false, description: "Each input's level (root mean square, 0..1) while it is open; without two, no bars." },
        { name: "label", type: "string", required: false, description: "The label before the buttons (Channel)." },
        { name: "app", type: "boolean", required: false, description: "Story only: render AppInputChannels, the app's live one (start a mic on another tab to see levels)." },
      ],
    },
    stories: [
      hand("Both, with levels", { value: "both", levels: [0.05, 0.004] }),
      hand("Input 2 heard", { value: "2", levels: [0.002, 0.08] }),
      hand("Input closed, no levels", { value: "both" }),
      hand("The app's channel, live", { app: true }),
    ],
    render: (props) =>
      props.app === true ? <div className="max-w-80"><AppInputChannels /></div> : <InputChannelsStory key={JSON.stringify(props)} value={channelOf(props.value)} levels={Array.isArray(props.levels) ? props.levels.filter((l): l is number => typeof l === "number") : []} />,
  },
  {
    id: "drone-controls",
    title: "DroneControls",
    keywords: ["drone", "note", "sound", "synth", "wave", "filter", "pitch", "sliders"],
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
    keywords: ["band", "metronome", "click", "drone", "backing", "drums", "bass", "tempo"],
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
    keywords: ["jam", "backing", "improvise", "band", "page"],
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
    keywords: ["backing track", "jam", "progression", "chords", "drums", "bass", "style", "bpm"],
    doc: {
      description: "The /theory/backing player: drums, bass and keys arranged from a chord progression, key and style (features/backing Band, its own clock). No props; saved in musickit.backing.",
      props: [],
    },
    stories: [hand("Default", {})],
    render: () => <BackingTrack />,
  },
];
