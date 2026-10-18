"use client";

import { useCallback, useEffect, useReducer } from "react";
import { EMPTY_STAGE, sanitiseStage, stageReducer, type Stage, type StageAction } from "@/features/stage";

const STORE = "musickit.studio.stage";

interface Held {
  stage: Stage;
  /** the saved stage is back: only then is saving allowed, so the empty start never overwrites it */
  ready: boolean;
}

type Msg = StageAction | { type: "load"; stage: Stage };

const reduce = (h: Held, a: Msg): Held => (a.type === "load" ? { stage: a.stage, ready: true } : { ...h, stage: stageReducer(h.stage, a) });

/** The stage, restored from the last visit after hydration and saved on every change after that. */
export default function useStage(pluginIds: string[]): [Stage, (a: StageAction) => void] {
  const [held, send] = useReducer(reduce, { stage: EMPTY_STAGE, ready: false });

  useEffect(() => {
    let saved = EMPTY_STAGE;
    try {
      saved = sanitiseStage(JSON.parse(window.localStorage.getItem(STORE) ?? "null"), pluginIds);
    } catch {
      /* storage blocked or a broken save: start empty */
    }
    send({ type: "load", stage: saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!held.ready) return;
    try {
      window.localStorage.setItem(STORE, JSON.stringify(held.stage));
    } catch {
      /* ignore */
    }
  }, [held]);

  const dispatch = useCallback((a: StageAction) => send(a), []);
  return [held.stage, dispatch];
}
