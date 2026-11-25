"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * A host's word that the tools under it hide their controls and show only their music (the content videos' record page,
 * where the tool sits over the camera). A tool that can hide them reads `useToolControlsShown`; its Space key still
 * starts and stops it. Today the guitar play-along and the melody singer (`CONTROLS_TOOLS`); any other tool keeps its
 * controls.
 */
const Hidden = createContext(false);

export const CONTROLS_TOOLS: readonly string[] = ["guitar-play-along", "melody-singer"];

/** Tools under it hide their controls when `hidden`. */
export function ToolControls({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return <Hidden.Provider value={hidden}>{children}</Hidden.Provider>;
}

/** Whether this tool shows its controls. */
export const useToolControlsShown = () => !useContext(Hidden);
