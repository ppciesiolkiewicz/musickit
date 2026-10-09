/**
 * Undo, redo and the list of changes. Every change goes through `do`, which applies it, remembers how to undo it and tells listeners.
 * Listeners (the macro recorder, the history panel) see the raw stream of actions, including every step of a slider drag;
 * the history list merges a drag into one line (see `coalesceKey`).
 * This file imports nothing outside src/lib/looper.
 */
import { applyAction, coalesceKey, describeAction, inverseOf, type ActionTarget, type LooperAction } from "./actions";

export interface HistoryEntry {
  id: number;
  /** ms timestamp of the last action merged into this line */
  at: number;
  action: LooperAction;
  /** undoes the whole line, even after merging */
  inverse: LooperAction;
  label: string;
  /** entries made by one macro run share a group and are undone together */
  group?: string;
}

export interface HistoryState {
  entries: readonly HistoryEntry[];
  /** entries[0..cursor) are applied, the rest are undone and can be redone */
  cursor: number;
}

export interface DoOptions {
  group?: string;
  /** "macro" actions are not recorded into a new macro */
  source?: "ui" | "macro";
}

export type HistoryEvent =
  | { kind: "do"; action: LooperAction; at: number; source: "ui" | "macro" }
  | { kind: "undo" | "redo"; entry: HistoryEntry }
  | { kind: "reset" };

export class ActionHistory {
  private entries: HistoryEntry[] = [];
  private cursor = 0;
  private nextId = 1;
  private lastKey: string | null = null;
  private listeners = new Set<(e: HistoryEvent) => void>();
  private stateListeners = new Set<() => void>();
  private state: HistoryState = { entries: [], cursor: 0 };

  constructor(
    private target: ActionTarget,
    private opts: { limit?: number; coalesceMs?: number; now?: () => number } = {},
  ) {}

  private now = () => (this.opts.now ?? Date.now)();

  /** Apply an action and remember it. Returns false when it did nothing (for example its target no longer exists). */
  do(action: LooperAction, o: DoOptions = {}): boolean {
    const snap = this.target.getSnapshot();
    const early = inverseOf(action, snap);
    const done = applyAction(this.target, action);
    if (!done) return false;
    // a creator learns its id only once it has run, so its inverse is worked out from what was really done
    const inverse = early ?? inverseOf(done, snap);
    action = done;
    const at = this.now();
    this.emit({ kind: "do", action, at, source: o.source ?? "ui" });
    if (!inverse) return false;

    const key = coalesceKey(action);
    const last = this.entries[this.cursor - 1];
    const joins = last && this.cursor === this.entries.length && key !== null && key === this.lastKey && last.group === o.group && at - last.at <= (this.opts.coalesceMs ?? 700);
    if (joins) {
      last.action = action;
      last.at = at;
      last.label = describeAction(action, snap);
    } else {
      this.entries = this.entries.slice(0, this.cursor);
      this.entries.push({ id: this.nextId++, at, action, inverse, label: describeAction(action, snap), group: o.group });
      const limit = this.opts.limit ?? 200;
      if (this.entries.length > limit) this.entries = this.entries.slice(this.entries.length - limit);
      this.cursor = this.entries.length;
    }
    this.lastKey = key;
    this.publish();
    return true;
  }

  get canUndo() { return this.cursor > 0; }
  get canRedo() { return this.cursor < this.entries.length; }

  /** Undo the last line (and the rest of its macro run). */
  undo(): boolean {
    if (!this.canUndo) return false;
    const group = this.entries[this.cursor - 1].group;
    do {
      const e = this.entries[--this.cursor];
      applyAction(this.target, e.inverse);
      this.emit({ kind: "undo", entry: e });
    } while (group !== undefined && this.cursor > 0 && this.entries[this.cursor - 1].group === group);
    this.lastKey = null;
    this.publish();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo) return false;
    const group = this.entries[this.cursor].group;
    do {
      const e = this.entries[this.cursor++];
      applyAction(this.target, e.action);
      this.emit({ kind: "redo", entry: e });
    } while (group !== undefined && this.cursor < this.entries.length && this.entries[this.cursor].group === group);
    this.lastKey = null;
    this.publish();
    return true;
  }

  /** Move to just after entry `index` (-1 for before the first), undoing or redoing as needed. */
  jumpTo(index: number) {
    const goal = Math.max(0, Math.min(this.entries.length, index + 1));
    while (this.cursor > goal && this.undo());
    while (this.cursor < goal && this.redo());
  }

  clear() {
    this.entries = [];
    this.cursor = 0;
    this.lastKey = null;
    this.emit({ kind: "reset" });
    this.publish();
  }

  getState = (): HistoryState => this.state;

  /** For useSyncExternalStore: changes of the list. */
  subscribe = (fn: () => void) => {
    this.stateListeners.add(fn);
    return () => { this.stateListeners.delete(fn); };
  };

  /** Every action, undo and redo as it happens. */
  onEvent(fn: (e: HistoryEvent) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(e: HistoryEvent) {
    this.listeners.forEach((f) => f(e));
  }

  private publish() {
    this.state = { entries: [...this.entries], cursor: this.cursor };
    this.stateListeners.forEach((f) => f());
  }
}
