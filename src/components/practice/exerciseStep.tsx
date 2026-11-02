"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * What a part of a step starts: the microphone, or a sound (a drone, the metronome, a band, chords, a play-along, a tune).
 * "Start exercise" starts the first part of each kind, so a step with three drone staffs starts one drone, not three.
 */
export type StepPartKind = "mic" | "drone" | "click" | "band" | "chords" | "play" | "tune";

/** One startable thing a tool hands the step: its kind, whether it runs, and how to start and stop it. */
export interface StepPart {
  /** `false`: the tool has nothing of this to start (a staff without the mic), so it is not counted */
  kind: StepPartKind | false;
  on: boolean;
  start: () => void | Promise<void>;
  stop: () => void;
}

type Handlers = { start: () => void | Promise<void>; stop: () => void };
type Entry = { id: string; kind: StepPartKind; on: boolean };

interface Step {
  register: (id: string, kind: StepPartKind, handlers: Handlers) => () => void;
  setOn: (id: string, on: boolean) => void;
  /** the audio focus group a part plays in: the step's, while the exercise runs and the part is one it started */
  groupFor: (id: string) => string | undefined;
  /** the parts "Start exercise" starts: the first of each kind */
  leads: string[];
  running: boolean;
  start: () => void;
  stop: () => void;
}

const StepContext = createContext<Step | null>(null);

/** the first part of each kind, in the order they registered (the page's order) */
const leadsOf = (parts: Entry[]) => {
  const seen = new Set<StepPartKind>();
  return parts.filter((p) => !seen.has(p.kind) && seen.add(p.kind)).map((p) => p.id);
};

/**
 * One step of an exercise (a heading and what follows it): the tools in it hand it what they can start (`useStepPart`),
 * and `StartExercise` starts them together. The run ends when Stop is pressed or when every part has stopped.
 */
export function ExerciseStep({ children }: { children: ReactNode }) {
  const stepId = useId();
  const [parts, setParts] = useState<Entry[]>([]);
  const handlers = useRef(new Map<string, Handlers>());
  const [started, setStarted] = useState(false);
  const anyOn = parts.some((p) => p.on);
  // everything stopped (by hand, by another sound starting, scrolled away): the run is over
  const [wasOn, setWasOn] = useState(anyOn);
  if (anyOn !== wasOn) {
    setWasOn(anyOn);
    if (!anyOn) setStarted(false);
  }

  const register = useCallback((id: string, kind: StepPartKind, h: Handlers) => {
    handlers.current.set(id, h);
    setParts((ps) => [...ps.filter((p) => p.id !== id), { id, kind, on: false }]);
    return () => {
      handlers.current.delete(id);
      setParts((ps) => ps.filter((p) => p.id !== id));
    };
  }, []);
  const setOn = useCallback((id: string, on: boolean) => {
    setParts((ps) => (ps.some((p) => p.id === id && p.on !== on) ? ps.map((p) => (p.id === id ? { ...p, on } : p)) : ps));
  }, []);
  const leads = useMemo(() => leadsOf(parts), [parts]);
  const step = useMemo<Step>(() => ({
    register,
    setOn,
    groupFor: (id) => (started && leads.includes(id) ? stepId : undefined),
    leads,
    running: started,
    start: () => {
      setStarted(true);
      for (const id of leads) void handlers.current.get(id)?.start();
    },
    // every part, lead or not, whoever started it
    stop: () => {
      setStarted(false);
      for (const h of handlers.current.values()) h.stop();
    },
  }), [register, setOn, started, leads, stepId]);
  return <StepContext.Provider value={step}>{children}</StepContext.Provider>;
}

/**
 * Hand a tool's startable part to the step it sits in (none: nothing happens, the tool works on its own). Returns the
 * audio focus group to play in (`useAudioFocus`'s third argument): set while "Start exercise" runs this part, so the
 * step's sounds play together instead of stopping each other.
 */
export function useStepPart({ kind, on, start, stop }: StepPart): string | undefined {
  const step = useContext(StepContext);
  const id = useId();
  const latest = useRef<Handlers>({ start, stop });
  useEffect(() => {
    latest.current = { start, stop };
  });
  const register = step?.register;
  const setOn = step?.setOn;
  useEffect(() => {
    if (!register || !kind) return;
    return register(id, kind, { start: () => latest.current.start(), stop: () => latest.current.stop() });
  }, [register, id, kind]);
  useEffect(() => {
    if (kind) setOn?.(id, on);
  }, [setOn, id, kind, on]);
  return kind ? step?.groupFor(id) : undefined;
}

/**
 * "Start exercise": starts everything the step's tools can start (the mic, the drone, the metronome, the chords) at once;
 * while it runs, "Stop exercise" stops all of it, also what was started or stopped by hand. Shown only when the step has
 * two or more kinds of thing to start.
 */
export function StartExercise() {
  const step = useContext(StepContext);
  if (!step || step.leads.length < 2) return null;
  const on = step.running;
  return (
    <button type="button" onClick={on ? step.stop : step.start} aria-pressed={on}
      title={on ? "Stop everything in this step" : "Start everything in this step at once"}
      className={`inline-flex h-9 w-fit items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition active:scale-[0.97] ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30" : "border-sky-400/70 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"}`}>
      <Icon name={on ? "square" : "play"} size={15} fill />
      {on ? "Stop exercise" : "Start exercise"}
    </button>
  );
}
