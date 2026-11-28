import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/*
 * A drawing of the looper's stage for the product page, not the looper itself: two coloured groups with loop circles
 * whose rings go round, a drum sequencer, and the metronome bar on top. Group names are the default ones (`GROUP_STARTS`
 * in src/lib/looper/rig.ts). The rings turn only when the visitor allows motion. Hidden from screen readers: the page's
 * text says what it shows.
 */

type Loop = { label: string; bars: number; delay: string };

const R = 26;
const C = 2 * Math.PI * R;

function LoopCircle({ label, bars, delay, tone }: Loop & { tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-800" />
          <circle
            cx="32" cy="32" r={R} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C}
            className="lsm-ring"
            style={{ animationDuration: `${bars * 2}s`, animationDelay: delay }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-slate-200">{bars} bar{bars > 1 ? "s" : ""}</span>
      </div>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

function Group({ name, tone, loops, children }: { name: string; tone: string; loops: Loop[]; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 p-3" style={{ borderColor: `color-mix(in oklab, ${tone} 60%, transparent)`, background: `color-mix(in oklab, ${tone} 8%, transparent)` }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: tone }}>{name}</span>
        <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-600 text-slate-300"><Icon name="square" size={10} /></span>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {loops.map((l) => <LoopCircle key={l.label} {...l} tone={tone} />)}
        {children}
      </div>
    </div>
  );
}

export default function LooperStageMock() {
  return (
    <div aria-hidden className="metal-panel relative rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
      <style>{`
        @keyframes lsm-ring { from { stroke-dashoffset: ${C}; } to { stroke-dashoffset: 0; } }
        @keyframes lsm-beat { 0%, 100% { opacity: .25; } 10% { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .lsm-ring { animation: lsm-ring linear infinite; }
          .lsm-beat { animation: lsm-beat 2s linear infinite; }
        }
        @media (prefers-reduced-motion: reduce) { .lsm-ring { stroke-dashoffset: ${C * 0.35}; } }
      `}</style>

      {/* metronome bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-400 text-slate-950"><Icon name="square" size={12} /></span>
        <span className="font-semibold text-slate-100">120 bpm</span>
        <span className="text-slate-500">4/4</span>
        <span className="flex gap-1">
          {[0, 1, 2, 3].map((b) => (
            <span key={b} className="lsm-beat h-2 w-2 rounded-full bg-teal-300" style={{ animationDelay: `${b * 0.5}s`, opacity: b === 0 ? 1 : 0.25 }} />
          ))}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-rose-300"><span className="h-2 w-2 rounded-full bg-rose-500" /> Recording</span>
      </div>

      {/* stage */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Group name="Room" tone="var(--color-teal-400)" loops={[{ label: "Chords", bars: 4, delay: "0s" }, { label: "Bass line", bars: 2, delay: "0s" }]} />
        <Group name="Echo" tone="var(--color-violet-400)" loops={[{ label: "Lead", bars: 4, delay: "-3s" }]}>
          <div className="flex flex-col items-center gap-1.5">
            <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-violet-400/60 text-violet-300"><Icon name="drum" size={22} /></span>
            <span className="text-[11px] text-slate-400">Drums</span>
          </div>
        </Group>
      </div>

      {/* inputs */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          { icon: "guitar" as const, label: "Guitar · input 1", level: "70%" },
          { icon: "mic" as const, label: "Vocal · input 2", level: "35%" },
          { icon: "piano" as const, label: "Piano", level: "0%" },
        ].map((i) => (
          <span key={i.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-slate-300">
            <Icon name={i.icon} size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{i.label}</span>
            <span className="relative h-1.5 w-10 overflow-hidden rounded-full bg-slate-800"><span className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: i.level }} /></span>
          </span>
        ))}
      </div>
    </div>
  );
}
