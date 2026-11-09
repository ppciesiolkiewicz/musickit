"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import type { JamPartView } from "../../jam/rig";

const card = "relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border bg-slate-900/60 p-4 sm:p-6 lg:p-8";

/** Each part keeps one colour, so the page reads as its instruments at a glance: its card's edge and wash, its icon and its play button. */
export const PART_TONE = {
  click: { card: "border-sky-500/30", wash: "from-sky-500/12", disc: "bg-sky-500/15 text-sky-300", ring: "border-sky-400/60 text-sky-100 hover:bg-sky-500/15", icon: "metronome" },
  drone: { card: "border-violet-500/30", wash: "from-violet-500/15", disc: "bg-violet-500/15 text-violet-300", ring: "border-violet-400/60 text-violet-100 hover:bg-violet-500/15", icon: "audio-lines" },
  drums: { card: "border-amber-500/30", wash: "from-amber-500/12", disc: "bg-amber-500/15 text-amber-300", ring: "border-amber-400/60 text-amber-100 hover:bg-amber-500/15", icon: "drum" },
  bass: { card: "border-teal-500/30", wash: "from-teal-500/12", disc: "bg-teal-500/15 text-teal-300", ring: "border-teal-400/60 text-teal-100 hover:bg-teal-500/15", icon: "waves" },
  loops: { card: "border-rose-500/30", wash: "from-rose-500/12", disc: "bg-rose-500/15 text-rose-300", ring: "border-rose-400/60 text-rose-100 hover:bg-rose-500/15", icon: "repeat" },
} as const;
export type Tone = (typeof PART_TONE)[keyof typeof PART_TONE];

/** A part's card: its colour along the edge and a soft wash from the top corner. The `full` view's cards, and the jam page's loops card. */
export function PartCard({ tone, label, tour, children }: { tone: Tone; label: string; tour?: string; children: ReactNode }) {
  return (
    <section data-tour={tour} aria-label={label} className={`${card} ${tone.card}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tone.wash} via-transparent to-transparent`} />
      <div className="relative flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** A part's play button: round, green while it plays. Starts and stops on the next beat. */
export function PlayButton({ on, name, onClick, tone, big = false }: { on: boolean; name: string; onClick: () => void; tone: Tone; big?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? `Stop the ${name}` : `Start the ${name}`} title={on ? "Stop on the next beat" : "Start on the next beat"}
      className={`grid shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${big ? "h-12 w-12" : "h-10 w-10"} ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : `bg-slate-900/60 ${tone.ring}`}`}>
      <Icon name={on ? "square" : "play"} size={big ? 20 : 16} fill />
    </button>
  );
}

const status = (v: JamPartView) => (v.running ? (v.stopping ? "Stopping" : "Playing") : v.state.playing ? "Starting" : "Stopped");

/** A part's name with its icon, and whether it plays. */
export function Title({ children, view, tone }: { children: ReactNode; view: JamPartView; tone: Tone }) {
  return (
    <div className="mr-auto flex min-w-0 items-center gap-3">
      <span className={`hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid ${tone.disc}`}><Icon name={tone.icon} size={18} /></span>
      <span className="min-w-0">
        <p className="text-lg font-light tabular-nums text-slate-50">{children}</p>
        <p className={`text-xs ${view.running ? "text-emerald-300" : "text-slate-400"}`}>{status(view)}</p>
      </span>
    </div>
  );
}
