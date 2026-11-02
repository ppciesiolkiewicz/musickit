"use client";

import { createContext, useContext } from "react";

/**
 * The pitch class a microphone hears now (0..11), or null. Note drawings (ScaleNeck, PositionBox, ChordDiagram, the arpeggio necks
 * and TriadBox) light every place that note falls. Provided by the teacher studio, around the widgets the microphone feeds, and by
 * `WithSettings` while its bar's Input line listens (`config.input`: scales, pentatonics, arpeggios, triads); elsewhere nothing is heard.
 */
export const HeardNote = createContext<number | null>(null);

export const useHeardNote = (): number | null => useContext(HeardNote);
