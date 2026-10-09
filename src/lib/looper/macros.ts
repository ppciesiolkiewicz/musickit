/**
 * Macros: a recorded run of actions with their timing, saved as JSON and replayed with one click.
 * Recording listens to the history's event stream; playing sends the actions back through the history, so a run can be undone in one step.
 * Format (version 1): { version, id, name, createdAt, duration, steps: [{ t: ms since start, action }] }. See spec/looper-actions.md.
 * This file imports nothing outside src/lib/looper.
 */
import { isAction, type LooperAction } from "./actions";
import type { ActionHistory } from "./history";

export interface MacroStep {
  /** ms since the macro started */
  t: number;
  action: LooperAction;
}

export interface Macro {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  /** ms from the first to the last step */
  duration: number;
  steps: MacroStep[];
}

export const MAX_MACRO_STEPS = 3000;

/** Records the actions a person makes until stopped. Actions replayed from a macro are ignored. */
export class MacroRecorder {
  private steps: MacroStep[] = [];
  private t0 = 0;
  private off: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private active = false;

  constructor(private history: ActionHistory, private now: () => number = Date.now) {}

  get recording() { return this.active; }
  get stepCount() { return this.steps.length; }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  start() {
    if (this.active) return;
    this.steps = [];
    this.t0 = -1;
    this.active = true;
    this.off = this.history.onEvent((e) => {
      if (e.kind !== "do" || e.source === "macro" || this.steps.length >= MAX_MACRO_STEPS) return;
      if (this.t0 < 0) this.t0 = e.at;
      this.steps.push({ t: e.at - this.t0, action: e.action });
      this.notify();
    });
    this.notify();
  }

  /** Stop and return the macro, or null if nothing was recorded. */
  stop(name: string, id: string = `m${this.now().toString(36)}`): Macro | null {
    this.off?.();
    this.off = null;
    this.active = false;
    const steps = this.steps;
    this.steps = [];
    this.notify();
    if (!steps.length) return null;
    return { version: 1, id, name: name.trim() || "Macro", createdAt: this.now(), duration: steps[steps.length - 1].t, steps };
  }

  private notify() {
    this.listeners.forEach((f) => f());
  }
}

export interface PlayOptions {
  /** 1 plays at the recorded pace, 2 twice as fast; 0 plays every step at once */
  speed?: number;
  schedule?: (fn: () => void, ms: number) => () => void;
  /** called when the run ends (finished or cancelled) */
  onEnd?: () => void;
}

const defaultSchedule = (fn: () => void, ms: number) => {
  const h = setTimeout(fn, ms);
  return () => clearTimeout(h);
};

/** Replay a macro through the history. All its steps share one group, so one undo takes the whole run back. Returns a cancel function. */
export function playMacro(history: ActionHistory, macro: Macro, o: PlayOptions = {}): () => void {
  const schedule = o.schedule ?? defaultSchedule;
  const speed = o.speed ?? 1;
  const group = `run-${macro.id}-${Date.now()}`;
  const cancels: (() => void)[] = [];
  let left = macro.steps.length;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    o.onEnd?.();
  };
  macro.steps.forEach((s) => {
    cancels.push(schedule(() => {
      history.do(s.action, { group, source: "macro" });
      if (--left === 0) finish();
    }, speed > 0 ? s.t / speed : 0));
  });
  if (!macro.steps.length) finish();
  return () => {
    cancels.forEach((c) => c());
    finish();
  };
}

/** Macros read back from storage or pasted JSON. Anything malformed is dropped, never thrown. */
export function parseMacros(json: string | null): Macro[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : [data];
  const out: Macro[] = [];
  list.forEach((m) => {
    if (typeof m !== "object" || m === null) return;
    const r = m as Record<string, unknown>;
    if (r.version !== 1 || typeof r.id !== "string" || typeof r.name !== "string" || !Array.isArray(r.steps)) return;
    const steps: MacroStep[] = [];
    r.steps.slice(0, MAX_MACRO_STEPS).forEach((s) => {
      const st = s as Record<string, unknown>;
      if (typeof st?.t === "number" && Number.isFinite(st.t) && st.t >= 0 && isAction(st.action)) steps.push({ t: st.t, action: st.action });
    });
    if (!steps.length) return;
    out.push({ version: 1, id: r.id, name: r.name.slice(0, 40), createdAt: typeof r.createdAt === "number" ? r.createdAt : 0, duration: steps[steps.length - 1].t, steps });
  });
  return out;
}

export const serialiseMacros = (m: Macro[]): string => JSON.stringify(m, null, 2);

const KEY = "musickit.looper.macros";

export function loadMacros(): Macro[] {
  try {
    return parseMacros(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function saveMacros(m: Macro[]) {
  try {
    window.localStorage.setItem(KEY, serialiseMacros(m));
  } catch {
    /* storage unavailable */
  }
}
