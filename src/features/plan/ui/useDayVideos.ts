"use client";

import { useEffect, useMemo, useState } from "react";
import { lookUpVideos } from "@/features/contentVideos/client/api";
import { dayVideos, drawnAsks } from "@/features/contentVideos/model/drawn";
import type { CellAsk } from "@/features/contentVideos/model/slot";
import type { CellVideo } from "@/features/contentVideos/model/lookup";
import type { PlayInfo } from "@/features/contentVideos/server/access";
import { isCuratedExercise } from "../model/blockId";
import type { PlanExercise } from "../model/types";

type Answer = { blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> };
export interface DayVideos {
  /** by exercise index, then tool cell: the video it shows */
  shown: Record<number, Record<number, PlayInfo>>;
  /** the last lookup failed; the exercises work without videos */
  failed: boolean;
  retry: () => void;
}

/** The asks of an exercise as first drawn: its version's first values, every choice at its first chip. */
const firstAsks = (e: PlanExercise): CellAsk[] => drawnAsks(e, e.given, {}, {});

/**
 * The content videos of a day, looked up each time it is drawn (a stored plan is a copy, so a video recorded today shows
 * in it): one request for every exercise of the day, by the tools as drawn now (`drawn`: what a card reports when its
 * chips move; the rest as first drawn), each video only at its first place in the day (`dayVideos`). Only a curated
 * exercise sends its block id (its own videos); every exercise asks for its tools' videos.
 */
export function useDayVideos(exercises: PlanExercise[], drawn: Record<number, CellAsk[]>): DayVideos {
  const asks = useMemo(() => exercises.map((e, i) => ({
    key: `e${i}`,
    ...(isCuratedExercise(e) ? { blockId: e.blockId } : {}),
    cells: drawn[i] ?? firstAsks(e),
  })), [exercises, drawn]);
  const body = JSON.stringify(asks);
  // answers by request body, so moving a chip back asks nothing
  const [answers, setAnswers] = useState<ReadonlyMap<string, Answer>>(() => new Map());
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const have = answers.has(body);
  useEffect(() => {
    if (have) return;
    const asked = JSON.parse(body) as typeof asks;
    if (!asked.some((a) => a.cells.length)) return;
    let live = true;
    lookUpVideos(asked).then(
      (got) => { if (live) setAnswers((m) => new Map(m).set(body, got)); },
      () => { if (live) setFailed(body); },
    );
    return () => { live = false; };
  }, [body, have, attempt]);
  const retry = () => { setFailed(null); setAttempt((n) => n + 1); };
  // while a chip's new answer is out, the day's last one stays (same exercises), so the buttons don't flash away
  const [last, setLast] = useState<{ exercises: PlanExercise[]; answer: Answer } | null>(null);
  const now = answers.get(body);
  if (now && (last?.answer !== now || last.exercises !== exercises)) setLast({ exercises, answer: now });
  const answer = now ?? (last?.exercises === exercises ? last.answer : null);
  const shown = useMemo(() => {
    if (!answer) return {};
    const keys = exercises.map((_, i) => `e${i}`);
    const byKey = dayVideos(keys, answer.blocks);
    const out: Record<number, Record<number, PlayInfo>> = {};
    keys.forEach((key, i) => {
      const cells = Object.hasOwn(byKey, key) ? byKey[key] : {};
      const row: Record<number, PlayInfo> = {};
      for (const [cell, id] of Object.entries(cells)) if (Object.hasOwn(answer.videos, id)) row[Number(cell)] = answer.videos[id];
      if (Object.keys(row).length) out[i] = row;
    });
    return out;
  }, [answer, exercises]);
  return { shown, failed: failed === body, retry };
}
