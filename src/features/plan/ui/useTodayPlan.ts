"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomId } from "../model/exerciseIds";
import { anotherDay, localDate, ownDay, startDay } from "../model/schedule";
import { dayWords, hasNewPicks } from "../model/today";
import type { PlanState, StoredPlan } from "../model/types";
import type { PlanStore } from "../store/PlanStore";
import { requestDay, type ComposeResult } from "../store/composeClient";

/** Why today's plan, or another one, isn't there: a route code, or the request itself. */
export type TodayFailure = "no-blocks" | "bad-date" | "offline" | "failed";

/**
 * What the page shows for today's plan. `making`: the first plan of the day is being put together (never yesterday's in
 * its place); `failed`: it could not be. Another plan: `asking` while it is asked for, `none` when no other exercises
 * exist for today's steps (the plan stays), `anotherFailed` when the request failed (the plan stays too).
 */
export interface TodayPlan {
  date: string;
  today: StoredPlan | null;
  making: boolean;
  failed: TodayFailure | null;
  retry: () => void;
  another: () => void;
  asking: boolean;
  none: boolean;
  anotherFailed: TodayFailure | null;
}

type Failed = Extract<ComposeResult, { ok: false }>["code"];
/** `no-answers` can't happen after the flush (the page has answers): it is said as a failed request, with the retry. */
const failure = (code: Failed): TodayFailure => (code === "no-answers" ? "failed" : code);

/**
 * Today's own plan, composed on the server when the page has answers and no plan for today. It runs once per page view
 * and date: the date is read when the page opens, so a page left open past midnight makes nothing until it is opened
 * again. The store is flushed before every request, so the server reads the answers and ratings the page has.
 */
export function useTodayPlan(state: PlanState, loaded: boolean, update: (change: (s: PlanState) => PlanState) => void, store: PlanStore): TodayPlan {
  const [date] = useState(() => localDate());
  const today = loaded ? ownDay(state, date) : null;
  const needed = loaded && !!state.answers && !today;
  const [failed, setFailed] = useState<TodayFailure | null>(null);
  // the date already asked for in this page view: React runs an effect twice in development
  const asked = useRef<string | null>(null);

  const make = useCallback(async () => {
    if ((await store.flush?.()) === false) return setFailed("failed");
    const r = await requestDay({ date, another: false });
    if (!r.ok) return setFailed(failure(r.code));
    let stale = false as boolean;
    update((s) => {
      const next = startDay(s, r.day, { date: r.date, attempt: r.attempt, ...dayWords(r.date, r.day.exercises) }, randomId);
      // a running plan of a later date (another tab, past midnight): this page's date is behind
      stale = !ownDay(next, date);
      return next;
    });
    if (stale) setFailed("bad-date");
  }, [date, store, update]);

  useEffect(() => {
    if (!needed || asked.current === date) return;
    asked.current = date;
    void make();
  }, [needed, date, make]);

  const retry = useCallback(() => {
    setFailed(null);
    void make();
  }, [make]);

  const [asking, setAsking] = useState(false);
  const [none, setNone] = useState(false);
  const [anotherFailed, setAnotherFailed] = useState<TodayFailure | null>(null);
  const another = useCallback(() => {
    setAsking(true);
    setNone(false);
    setAnotherFailed(null);
    void (async () => {
      try {
        if ((await store.flush?.()) === false) return setAnotherFailed("failed");
        const r = await requestDay({ date, another: true });
        // no other exercise and none rated: the route has no day to give; the plan stays
        if (!r.ok) return r.code === "no-blocks" ? setNone(true) : setAnotherFailed(failure(r.code));
        let outcome = "unchanged" as "none" | "changed" | "unchanged";
        update((s) => {
          if (!hasNewPicks(ownDay(s, date), r.day)) {
            outcome = "none";
            return s;
          }
          const next = anotherDay(s, r.day, { date: r.date, attempt: r.attempt, ...dayWords(r.date, r.day.exercises) }, randomId);
          outcome = next === s ? "unchanged" : "changed";
          return next;
        });
        if (outcome === "none") setNone(true);
        else if (outcome === "unchanged") setAnotherFailed("failed");
      } finally {
        setAsking(false);
      }
    })();
  }, [date, store, update]);

  return { date, today, making: needed && !failed, failed: needed ? failed : null, retry, another, asking, none, anotherFailed };
}
