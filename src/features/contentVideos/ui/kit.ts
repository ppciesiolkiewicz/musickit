"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { KitNote } from "@/features/exercises/cues/cueNotes";
import type { TakeNote } from "@/features/neckFx/model/cvFx";
import type { Piece } from "../model/clock";
import type { KeptTake } from "../model/takeKey";
import type { Overlay } from "../model/overlay";
import { clickClock, takeNotes } from "../model/takeNotes";

/** Another drawing of the tool, for the tool's box over the camera and the take, at a beat (null: stopped). */
export interface KitView { id: string; label: string; draw(beat: number | null): ReactNode }

/** What a page gives the recorder beside its tool. With none, the recorder is as it always was. */
export interface RecordKit {
  /** drawn in the tool's box instead of the tool; the tool itself is always the first choice, "Tool" */
  views?: KitView[];
  /** the notes the tool plays, one pass, in beats: for the neck readers and the detection log */
  notes?: KitNote[];
  /** how many beats one pass lasts, so the notes repeat through a looping take; null or none: once */
  loopBeats?: number | null;
  /** the key, for degree labels on the neck */
  key?: { tonic: number; scale: string };
  /** under the take's buttons: what the tool offers on a finished take */
  afterTake?: (take: KeptTake, video: HTMLVideoElement | null) => ReactNode;
}

/** The View list's first choice: the tool itself. */
export const TOOL_VIEW = "tool";
const viewKey = (tool: string) => `musickit.content.view.${tool}`;

/** The kit view picked for this tool (kept in this browser), or null for the tool itself. */
export function useKitView(tool: string, kit: RecordKit | undefined): [KitView | null, string, (id: string) => void] {
  const [picked, setPicked] = useState(() => { try { return localStorage.getItem(viewKey(tool)) ?? TOOL_VIEW; } catch { return TOOL_VIEW; } });
  const view = kit?.views?.find((v) => v.id === picked) ?? null;
  const pick = (id: string) => { setPicked(id); try { localStorage.setItem(viewKey(tool), id); } catch { /* this visit only */ } };
  return [view, view ? view.id : TOOL_VIEW, pick];
}

/** The take's clock from the video's time to the tool's beat: its overlay's, else the click's grid, else none. */
export const takeClock = (overlay: Overlay | null | undefined, click: KeptTake["click"]): Piece[] | null =>
  overlay?.clock ?? (click ? clickClock(click.downbeat, click.bpm) : null);

/** The kit's notes at their times in the take, or none without notes or a clock. */
export function useTakeNotes(kit: RecordKit | undefined, clock: Piece[] | null, seconds: number): TakeNote[] | undefined {
  const notes = kit?.notes;
  const loopBeats = kit?.loopBeats ?? null;
  return useMemo(() => (notes?.length && clock ? takeNotes(notes, loopBeats, clock, seconds) : undefined), [notes, loopBeats, clock, seconds]);
}

/**
 * A beat read each animation frame from `read`; the component re-renders only when the beat moves by a hundredth (or
 * starts or stops), so a held beat costs nothing.
 */
export function useFrameBeat(read: () => number | null): number | null {
  const [beat, setBeat] = useState<number | null>(null);
  useEffect(() => {
    let id = 0;
    const frame = () => {
      const b = read();
      const r = b === null ? null : Math.round(b * 100) / 100;
      setBeat((was) => (was === r ? was : r));
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [read]);
  return beat;
}
