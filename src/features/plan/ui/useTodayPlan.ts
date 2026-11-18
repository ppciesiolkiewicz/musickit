"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomId } from "../model/exerciseIds";
import { localDate, ownDay } from "../model/schedule";
import { applyAnother, applyFirst, shouldAsk, todayView, type TodayFailure, type TodayView } from "../model/today";
import type { PlanState } from "../model/types";
import type { PlanStore } from "../store/PlanStore";
import { requestDay } from "../store/composeClient";

export type { TodayFailure } from "../model/today";

/**
 * What the page shows for today's plan (`view`, from `todayView`), `retry` (asks again), and another plan: `another` asks,
 * `asking` while it is out, `none` when no other exercises exist for today's steps, `anotherFailed` when the request
 * failed (the plan stays in both cases).
 */
export interface TodayPlan {
  date: string;
  view: TodayView;
  retry: () => void;
  another: () => void;
  asking: boolean;
  none: boolean;
  anotherFailed: TodayFailure | null;
}

/**
 * Today's own plan, composed on the server when the page has answers and no plan for today. It is asked for once per page
 * view and date: the date is read when the page opens, so a page left open past midnight makes nothing until it is opened
 * again. The store is flushed before every request, so the server reads the answers and ratings the page has. What an
 * answer means is decided in `model/today.ts` (`applyFirst`, `applyAnother`); this hook holds the requests and their state.
 */
export function useTodayPlan(state: PlanState, loaded: boolean, update: (change: (s: PlanState) => PlanState) => void, store: PlanStore): TodayPlan {
  const [date] = useState(() => localDate());
  const own = loaded ? ownDay(state, date) : null;
  const answers = !!state.answers;
  // the date asked for in this page view, and whether its request is out (state, for the view; the ref guards React's double effect)
  const [req, setReq] = useState<{ date: string; inFlight: boolean } | null>(null);
  const askedRef = useRef<string | null>(null);
  const [failure, setFailure] = useState<TodayFailure | null>(null);

  const make = useCallback(async () => {
    setReq({ date, inFlight: true });
    setFailure(null);
    try {
      if ((await store.flush?.()) === false) return setFailure("failed");
      const r = await requestDay({ date, another: false });
      let failed: TodayFailure | null = null;
      update((s) => {
        const o = applyFirst(s, date, r, randomId);
        failed = o.failure;
        return o.state;
      });
      setFailure(failed);
    } catch {
      setFailure("failed");
    } finally {
      setReq({ date, inFlight: false });
    }
  }, [date, store, update]);

  const asked = req?.date === date;
  useEffect(() => {
    if (!shouldAsk({ loaded, answers, own, asked: askedRef.current === date })) return;
    askedRef.current = date;
    void make();
  }, [loaded, answers, own, date, make]);

  const retry = useCallback(() => {
    askedRef.current = date;
    void make();
  }, [date, make]);

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
        let outcome = "failed" as "changed" | "none" | TodayFailure;
        update((s) => {
          const o = applyAnother(s, date, r, randomId);
          outcome = o.outcome;
          return o.state;
        });
        if (outcome === "none") setNone(true);
        else if (outcome !== "changed") setAnotherFailed(outcome);
      } catch {
        setAnotherFailed("failed");
      } finally {
        setAsking(false);
      }
    })();
  }, [date, store, update]);

  const view = todayView({ loaded, answers, own, asked, inFlight: req?.date === date && req.inFlight, failure });
  return { date, view, retry, another, asking, none, anotherFailed };
}
