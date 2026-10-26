"use client";

import { createContext, useContext } from "react";

/**
 * The pitch class a microphone hears now (0..11), or null. Note drawings (ScaleNeck, PositionBox, ChordDiagram) light every place that
 * note falls. Only the teacher studio provides it, around the widgets the microphone feeds; everywhere else nothing is heard.
 */
export const HeardNote = createContext<number | null>(null);

export const useHeardNote = (): number | null => useContext(HeardNote);
