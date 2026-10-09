import type { ComponentType } from "react";
import type { IconName } from "@/components/Icon";
import ScalePlugin from "./ScalePlugin";
import ChordsPlugin from "./ChordsPlugin";
import CirclePlugin from "./CirclePlugin";
import KeysPlugin from "./KeysPlugin";
import ProgressionsPlugin from "./ProgressionsPlugin";
import ModesPlugin from "./ModesPlugin";

/**
 * A creator plugin: a panel that follows the shared key (useCreatorKey) and shows a general page when there is none.
 * To add one: write the component in this folder, add it here. Nothing else needs to know about it.
 */
export interface PluginDef {
  id: string;
  title: string;
  icon: IconName;
  Component: ComponentType;
}

export const PLUGINS: PluginDef[] = [
  { id: "scale", title: "Scale", icon: "music", Component: ScalePlugin },
  { id: "chords", title: "Chords", icon: "layout-dashboard", Component: ChordsPlugin },
  { id: "circle", title: "Circle of fifths", icon: "circle-dot", Component: CirclePlugin },
  { id: "keys", title: "Keys", icon: "piano", Component: KeysPlugin },
  { id: "progressions", title: "Progressions", icon: "repeat", Component: ProgressionsPlugin },
  { id: "modes", title: "Modes", icon: "audio-lines", Component: ModesPlugin },
];

export const DEFAULT_OPEN = ["scale", "chords", "circle", "keys"];

/** Keep the saved list to plugins that still exist, in registry order. */
export function sanitiseOpen(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_OPEN;
  const want = new Set(raw.filter((x): x is string => typeof x === "string"));
  return PLUGINS.filter((p) => want.has(p.id)).map((p) => p.id);
}
