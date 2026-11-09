"use client";

import Icon from "@/components/Icon";

export type Look = "roll" | "staff";

const KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const LIT = "bg-sky-500/20 text-sky-100";

/**
 * The tool's own option controls, the same on the tool (in a plan) and in a page's side panel.
 */

/** Do and the note to sing on a piano roll or on the staff */
export function LookSwitch({ look, onLook }: { look: Look; onLook: (l: Look) => void }) {
  return (
    <span role="group" aria-label="View" className="inline-flex rounded-lg border border-slate-800 p-0.5 text-xs text-slate-400">
      {(["roll", "staff"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={look === l} onClick={() => onLook(l)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${look === l ? LIT : "hover:text-slate-200"}`}>
          <Icon name={l === "roll" ? "piano" : "music"} size={13} />{l === "roll" ? "Piano roll" : "Staff"}
        </button>
      ))}
    </span>
  );
}

/** Where Do comes from: the keys picked on the chips, or any of the twelve; switching keeps the keys picked */
export function KeysSwitch({ random, onRandom }: { random: boolean; onRandom: (r: boolean) => void }) {
  return (
    <span role="group" aria-label="Keys" className="inline-flex rounded-lg border border-slate-800 p-0.5 text-xs text-slate-400">
      {([false, true] as const).map((r) => (
        <button key={String(r)} type="button" aria-pressed={random === r} onClick={() => onRandom(r)} title={r ? "Any of the 12 keys: a random Do each time" : "Only the keys picked"}
          className={`rounded-md px-2 py-1 transition ${random === r ? LIT : "hover:text-slate-200"}`}>{r ? "Random" : "Pick"}</button>
      ))}
    </span>
  );
}

/** One chip per key: one more key or one less */
export function KeyChips({ picked, onToggle }: { picked: number[]; onToggle: (k: number) => void }) {
  return (
    <span role="group" aria-label="Keys picked" className="inline-flex flex-wrap items-center gap-0.5 text-xs">
      {KEY_NAMES.map((name, k) => (
        <button key={k} type="button" aria-pressed={picked.includes(k)} onClick={() => onToggle(k)}
          title={picked.includes(k) ? (picked.length > 1 ? `Leave out ${name}` : "At least one key") : `Ask in ${name} too`}
          className={`min-w-7 rounded-md px-1.5 py-1 transition ${picked.includes(k) ? LIT : "text-slate-500 hover:text-slate-200"}`}>{name}</button>
      ))}
    </span>
  );
}
