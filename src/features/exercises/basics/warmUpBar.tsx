"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { useToolKeys } from "@/components/practice/toolKeys";
import { Button, Chip, DropdownSection, Hint, KeyCap, SettingsRow, Tile, hueAt } from "@/components/ui";
import { ToolSettings, savedSetting, type RowLook } from "@/features/settings";
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
export function WarmUpBar({ status, onStart, onStop, onRestart, onSkip, skip, what, armed, settings, hostSettings = false, children }: Actions & {
  /** what Skip moves on to, for its hint: "the next round" */
  skip: string;
  /** what Start does, for its hint */
  what: string;
  /** the keys go to this tool: show the key caps */
  armed: boolean;
  /** more under the settings button beside the volume (the play-ahead) */
  settings?: ReactNode;
  /** the page holds the volume and settings in its settings panel: no volume or settings button here */
  hostSettings?: boolean;
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
      {!hostSettings && <Hint title={settings ? "Settings" : "Volume"} description={settings ? "The volume, and the settings under the button." : "Sets every sound in the app, not just this warm-up."}><ToolSettings more={settings} /></Hint>}
    </div>
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

export const useRollAccuracy = savedSetting<number>(ROLL_KEY, ROLL_ACCURACIES[0].cents, (v) => ROLL_ACCURACIES.some((a) => a.cents === v));

const ROLL_INFO = <>How close your line has to be to the tone&apos;s to show green. A semitone is 100 cents (¢). A lip roll wobbles, so start on Easy and move up when your line stays green.</>;

/** The lip roll's accuracy, in the look of the singing tools' Accuracy: a panel row ("bar") or tiles for the settings button ("menu"). */
export function RollAccuracy({ look = "menu" }: { look?: RowLook }) {
  const [cents, onChange] = useRollAccuracy();
  if (look === "bar") {
    return (
      <SettingsRow label="Accuracy" info={ROLL_INFO}>
        {ROLL_ACCURACIES.map((a) => <Chip key={a.title} on={a.cents === cents} onClick={() => onChange(a.cents)} title={`Within ${a.cents} cents of the line shows green`}>{a.title}</Chip>)}
      </SettingsRow>
    );
  }
  return (
    <DropdownSection title="Accuracy" info={ROLL_INFO}>
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
