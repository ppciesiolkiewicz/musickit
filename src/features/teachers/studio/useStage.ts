"use client";

import { useCallback, useEffect, useReducer } from "react";
import { EMPTY_STAGE, sanitiseStage, stageReducer, type Stage, type StageAction } from "@/features/stage";
import { decodeNote, noteFromHash, notesStart } from "./notes";

const STORE = "musickit.studio.stage";
const NOTES_STORE = "musickit.studio.notes";

interface Held {
  stage: Stage;
  /** the saved stage is back: only then is saving allowed, so the empty start never overwrites it */
  ready: boolean;
}

type Msg = StageAction | { type: "load"; stage: Stage };

const reduce = (h: Held, a: Msg): Held => (a.type === "load" ? { stage: a.stage, ready: true } : { ...h, stage: stageReducer(h.stage, a) });

/**
 * The stage, restored from the last visit after hydration and saved on every change after that. With `preset` (a note made ahead, opened to
 * edit) it starts as that stage and nothing is read or stored, so the creator's own saved stage is left alone; `keep` is handed the stage
 * on every change instead.
 */
export default function useStage(pluginIds: string[], notes = false, preset: Stage | null = null, keep?: (stage: Stage) => void): [Stage, (a: StageAction) => void, (stage: Stage) => void] {
  const [held, send] = useReducer(reduce, { stage: EMPTY_STAGE, ready: false });

  const store = notes ? NOTES_STORE : STORE;
  useEffect(() => {
    if (preset) return send({ type: "load", stage: preset });
    let saved = EMPTY_STAGE;
    try {
      saved = sanitiseStage(JSON.parse(window.localStorage.getItem(store) ?? "null"), pluginIds);
    } catch {
      /* storage blocked or a broken save: start empty */
    }
    if (notes) saved = notesStart(saved);
    // a shared note in the link wins over the last visit
    const note = notes ? noteFromHash(window.location.hash) : null;
    if (note) void decodeNote(note, pluginIds).then((s) => send({ type: "load", stage: s ?? saved }));
    else send({ type: "load", stage: saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!held.ready) return;
    // a preset is never stored: its host keeps it, if it wants to
    if (preset) return void keep?.(held.stage);
    try {
      window.localStorage.setItem(store, JSON.stringify(held.stage));
    } catch {
      /* ignore */
    }
  }, [held, store, preset, keep]);

  const dispatch = useCallback((a: StageAction) => send(a), []);
  /** the whole stage replaced in one go (the note read back from its text) */
  const load = useCallback((stage: Stage) => send({ type: "load", stage }), []);
  return [held.stage, dispatch, load];
}
