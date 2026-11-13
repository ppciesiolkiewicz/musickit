"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { useToolKeys } from "@/components/practice/toolKeys";
import ToolSettings from "@/components/practice/ToolSettings";
import { Button, DropdownSection, Hint, KeyCap, Slider, Tile, hueAt } from "@/components/ui";
import { DOT_LAG_MS } from "@/components/theory/singing/MelodyStaff";
import { useCoverage } from "@/features/guide/useCoverage";

export type WarmUpStatus = "idle" | "running" | "done";

interface Actions {
  status: WarmUpStatus;
  onStart(): void;
  onStop(): void;
  onRestart(): void;
  onSkip(): void;
}

/**
 * A warm-up's keys, as on the other singing tools: Space presses the big button (Start, Stop, or Restart once done; not
 * on a focused button, which Space already presses), R restarts. Put `ref` on the tool's outer element; `armed` shows the key caps.
 */
export function useWarmUpKeys({ status, onStart, onStop, onRestart }: Actions) {
  const keys = useRef<Record<string, () => void>>({});
  useEffect(() => {
    keys.current = { " ": status === "running" ? onStop : status === "done" ? onRestart : onStart, ...(status !== "idle" ? { r: onRestart } : {}) };
  });
  return useToolKeys((e, onControl) => {
    const k = e.key.toLowerCase();
    if (!(k in keys.current) || (k === " " && onControl)) return;
    keys.current[k]();
    return true;
  });
}

/** the big button's look, as on the other singing tools (Sing an interval's Start and Next) */
const BIG = "inline-flex min-w-[6.5rem] items-center justify-center gap-1.5 !border-sky-400/80 !bg-sky-500/25 !text-sky-50";

/**
 * The warm-ups' toolbar, laid out like the other singing tools': the big button first (Start; Stop while it runs;
 * Restart once it is done), then Restart and Skip, always drawn and off until it runs so nothing moves on Start, then the tool's own controls (`children`: the mic,
 * Play note), and the volume at the end. The tool wraps it in its own `data-tour` (a literal, for the tour test).
 */
export function WarmUpBar({ status, onStart, onStop, onRestart, onSkip, skip, what, armed, settings, children }: Actions & {
  /** what Skip moves on to, for its hint: "the next round" */
  skip: string;
  /** what Start does, for its hint */
  what: string;
  /** the keys go to this tool: show the key caps */
  armed: boolean;
  /** more under the settings button beside the volume (the play-ahead) */
  settings?: ReactNode;
  children?: ReactNode;
}) {
  useCoverage({ hints: 5 });
  const running = status === "running";
  const done = status === "done";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
      <span className="inline-flex flex-wrap items-center gap-2">
        {running ? (
          <Hint title="Stop" description="Stops the warm-up and the mic. Start begins it again from the first one.">
            <Button size="sm" onClick={onStop} title="Stop (Space)" className={BIG}>
              <Icon name="square" size={12} fill />Stop{armed && <KeyCap className="hidden md:inline">Space</KeyCap>}
            </Button>
          </Hint>
        ) : (
          <Hint title={done ? "Restart" : "Start"} description={what}>
            <Button size="sm" onClick={done ? onRestart : onStart} title={`${done ? "Restart" : "Start"} (Space)`} className={BIG}>
              <Icon name={done ? "rotate-ccw" : "play"} size={13} />{done ? "Restart" : "Start"}{armed && <KeyCap className="hidden md:inline">Space</KeyCap>}
            </Button>
          </Hint>
        )}
        {/* always drawn, so nothing moves on Start: off until it runs */}
        <Hint title="Restart" description="Starts again from the first one.">
          <Button size="sm" disabled={!running} onClick={onRestart} title="Start again from the first one (R)" className="inline-flex items-center gap-1.5">
            Restart{armed && <KeyCap className="hidden md:inline">R</KeyCap>}
          </Button>
        </Hint>
        <Hint title="Skip" description={`Moves on to ${skip}.`}>
          <Button size="sm" disabled={!running} onClick={onSkip} title={`Move on to ${skip}`}>Skip</Button>
        </Hint>
      </span>
      {children}
      <span className="ml-auto" />
      <Hint title={settings ? "Settings" : "Volume"} description={settings ? "The volume, and the settings under the button." : "Sets every sound in the app, not just this warm-up."}><ToolSettings more={settings} /></Hint>
    </div>
  );
}

/** where the play-ahead is kept: the same one the staff's sing-along and the singing pages use */
const LAG_KEY = "singing.lag";
const MAX_LAG_MS = 1000;

/**
 * The play-ahead, as on the staff: how far behind the playhead your voice is drawn, in ms, to make up for the mic's delay.
 * Shared with the singing pages (one setting in this browser); the saved one comes back after hydration.
 */
export function usePlayAhead(): [number, (ms: number) => void] {
  const [ms, setMs] = useState(DOT_LAG_MS);
  useEffect(() => {
    try {
      const v: unknown = JSON.parse(window.localStorage.getItem(LAG_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved pick after hydration
      if (typeof v === "number" && v >= 0 && v <= MAX_LAG_MS) setMs(v);
    } catch { /* storage blocked */ }
  }, []);
  const pick = (v: number) => {
    setMs(v);
    try { window.localStorage.setItem(LAG_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  return [ms, pick];
}

/** The play-ahead slider, for the settings button (`WarmUpBar`'s `settings`), as on the staff. */
export function PlayAhead({ ms, onChange }: { ms: number; onChange(ms: number): void }) {
  return (
    <DropdownSection title="Play-ahead" info={<>How far behind the playhead your voice is drawn. Raise it when your line runs late against the tone.</>}>
      <span className="flex items-center gap-2">
        <Slider min={0} max={MAX_LAG_MS} step={10} value={ms} onChange={onChange} size="sm" className="w-40" aria-label="Play-ahead" />
        <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{ms} ms</span>
      </span>
    </DropdownSection>
  );
}

/**
 * How close a lip roll has to be to the tone's line to count as on it, in cents: wider than a sung note's (`ACCURACIES`),
 * since a lip roll buzzes and wobbles. Kept in this browser.
 */
export const ROLL_ACCURACIES = [
  { title: "Easy", cents: 150 },
  { title: "Medium", cents: 100 },
  { title: "Hard", cents: 50 },
  { title: "Pro", cents: 25 },
] as const;
const ROLL_KEY = "musickit.lipRoll.accuracy";

export function useRollAccuracy(): [number, (cents: number) => void] {
  const [cents, setCents] = useState<number>(ROLL_ACCURACIES[0].cents);
  useEffect(() => {
    try {
      const v: unknown = JSON.parse(window.localStorage.getItem(ROLL_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved pick after hydration
      if (ROLL_ACCURACIES.some((a) => a.cents === v)) setCents(v as number);
    } catch { /* storage blocked */ }
  }, []);
  const pick = (v: number) => {
    setCents(v);
    try { window.localStorage.setItem(ROLL_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  return [cents, pick];
}

/** The lip roll's accuracy tiles, for the settings button, in the look of the singing tools' Accuracy. */
export function RollAccuracy({ cents, onChange }: { cents: number; onChange(cents: number): void }) {
  return (
    <DropdownSection title="Accuracy" info={<>How close your line has to be to the tone&apos;s to show green. A semitone is 100 cents (¢). A lip roll wobbles, so start on Easy and move up when your line stays green.</>}>
      <div role="radiogroup" aria-label="Accuracy" className="grid grid-cols-4 gap-1.5">
        {ROLL_ACCURACIES.map((a, i) => (
          <Tile key={a.title} radio hue={hueAt(i + 8)} on={a.cents === cents} onClick={() => onChange(a.cents)} title={`Within ${a.cents} cents of the line shows green`}
            icon={<span className="text-[11px] font-semibold tabular-nums">±{a.cents}</span>}>
            {a.title}
          </Tile>
        ))}
      </div>
    </DropdownSection>
  );
}
