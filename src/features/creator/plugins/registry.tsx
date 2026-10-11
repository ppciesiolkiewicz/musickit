import type { ComponentType } from "react";
import type { IconName } from "@/components/Icon";
import ScalePlugin from "./ScalePlugin";
import ChordsPlugin from "./ChordsPlugin";
import CirclePlugin from "./CirclePlugin";
import KeysPlugin from "./KeysPlugin";
import ProgressionsPlugin from "./ProgressionsPlugin";
import ModesPlugin from "./ModesPlugin";
import TriadsPlugin from "./TriadsPlugin";
import CagedPlugin from "./CagedPlugin";
import ArpeggiosPlugin from "./ArpeggiosPlugin";
import ImprovPlugin from "./ImprovPlugin";
import { ArpeggiosFull, CagedFull, ChordsFull, CircleFull, ImprovFull, ModesFull, ProgressionsFull, ScaleFull, TriadsFull } from "./full";

/**
 * A creator plugin: a panel that follows the shared key (useCreatorKey) and shows a general page when there is none.
 * Each theory page has one: `Component` is its compact view, `Full` the page itself (see full.tsx); the panel switches between them.
 * To add one: write the component in this folder, add it here. Nothing else needs to know about it.
 */
export interface PluginDef {
  id: string;
  title: string;
  icon: IconName;
  /** the compact view */
  Component: ComponentType;
  /** the full view: the whole theory page, following the key */
  Full?: ComponentType;
}

export const PLUGINS: PluginDef[] = [
  { id: "scale", title: "Scale", icon: "music", Component: ScalePlugin, Full: ScaleFull },
  { id: "chords", title: "Chords", icon: "layout-dashboard", Component: ChordsPlugin, Full: ChordsFull },
  { id: "circle", title: "Circle of fifths", icon: "circle-dot", Component: CirclePlugin, Full: CircleFull },
  { id: "keys", title: "Keys", icon: "piano", Component: KeysPlugin },
  { id: "progressions", title: "Progressions", icon: "repeat", Component: ProgressionsPlugin, Full: ProgressionsFull },
  { id: "modes", title: "Modes", icon: "sliders-horizontal", Component: ModesPlugin, Full: ModesFull },
  { id: "triads", title: "Triads", icon: "audio-lines", Component: TriadsPlugin, Full: TriadsFull },
  { id: "caged", title: "CAGED", icon: "rows-3", Component: CagedPlugin, Full: CagedFull },
  { id: "arpeggios", title: "Arpeggios", icon: "activity", Component: ArpeggiosPlugin, Full: ArpeggiosFull },
  { id: "improv", title: "Improvisation", icon: "drum", Component: ImprovPlugin, Full: ImprovFull },
];

export const DEFAULT_OPEN = ["scale", "chords", "circle", "keys"];

/** Keep the saved list to plugins that still exist, in registry order. */
export function sanitiseOpen(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_OPEN;
  const want = new Set(raw.filter((x): x is string => typeof x === "string"));
  return PLUGINS.filter((p) => want.has(p.id)).map((p) => p.id);
}

export type View = "compact" | "full";

/** Keep the saved views to plugins that have a full view; anything else is compact. */
export function sanitiseViews(raw: unknown): Record<string, View> {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out: Record<string, View> = {};
  PLUGINS.forEach((p) => { if (p.Full && o[p.id] === "full") out[p.id] = "full"; });
  return out;
}
