"use client";

/**
 * The intro's scenes, drawn on a 960 × 540 stage the player scales to fit. Each scene is a pure function of `local` (seconds into
 * the scene) and `at` (its cue times), so seeking, pausing and the silent fallback all draw the same frame for the same time.
 * They are built from the app's own pieces (the wordmark, icons, the nav's section list, the help buttons' compass) drawn
 * still, not the live pages: a tour must not start the mic or the sound engine.
 */
import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import Wordmark from "@/components/Wordmark";
import { TourIcon } from "@/features/guide/PageHelp";
import { GROUP_LABEL, sectionsIn, type SectionGroup } from "@/features/theory/sections";

export type SceneProps = { local: number; at: Record<string, number> };

const past = (p: SceneProps, cue: string) => p.at[cue] !== undefined && p.local >= p.at[cue];
/** The last cue of `cues` that has fired, or null. */
function latest(p: SceneProps, cues: string[]): string | null {
  let best: string | null = null;
  for (const c of cues) if (past(p, c) && (best === null || p.at[c] >= p.at[best])) best = c;
  return best;
}

const fade = (on: boolean, extra = "") => `transition-all duration-500 ease-out ${on ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"} ${extra}`;

export function Keycap({ children, down = false, wide = false }: { children: ReactNode; down?: boolean; wide?: boolean }) {
  return (
    <kbd
      className={`inline-flex h-14 items-center justify-center rounded-xl border font-sans text-2xl font-medium transition-all duration-150 ${wide ? "w-56" : "min-w-14 px-3"} ${down ? "translate-y-1 border-sky-400 bg-sky-500/25 text-sky-100 shadow-none" : "border-slate-600 bg-slate-800 text-slate-200 shadow-[0_4px_0_rgb(51_65_85)]"}`}
    >
      {children}
    </kbd>
  );
}

function Ring({ on, children, className = "" }: { on: boolean; children: ReactNode; className?: string }) {
  return <span className={`relative inline-flex rounded-full transition ${on ? "ring-4 ring-sky-400/60 ring-offset-2 ring-offset-slate-950" : ""} ${className}`}>{children}</span>;
}

/* ---------- 1. hello ---------- */

export function Hello(p: SceneProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className={fade(true)}>
        <Wordmark className="text-[7rem]" />
      </div>
      <p className={fade(past(p, "tagline"), "text-3xl text-slate-300")}>Practice tools for guitar and singing</p>
      <div className={fade(past(p, "look"), "flex gap-3")}>
        {(["guitar", "mic", "piano", "metronome", "ear"] as IconName[]).map((n) => (
          <span key={n} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-sky-300">
            <Icon name={n} size={26} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 2. menu ---------- */

const MENU_CUES: SectionGroup[] = ["learn", "guitar", "singing", "tools"];
/** The pages the narrator names in each menu: lit while it's open. */
const NAMED: Record<SectionGroup, string[]> = {
  learn: ["Course", "AI practice plan"],
  guitar: ["Chords", "Scales", "CAGED", "Fretboard notes", "Rhythm"],
  singing: ["Voice warm-ups", "Sing a scale", "Sing melodies"],
  tools: ["Tuner", "Looper", "Backing tracks", "Notes creator"],
};

function NavBar({ open }: { open: SectionGroup | null }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-800 px-8 py-4">
      <Wordmark className="mr-6 text-[1.7rem]" />
      <span className="px-3.5 py-2 text-base text-slate-400">Home</span>
      {MENU_CUES.map((g) => (
        <span key={g} className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-base transition ${open === g ? "bg-sky-500/20 text-sky-100" : "text-slate-400"}`}>
          {GROUP_LABEL[g]} <Icon name="chevron-down" size={14} />
        </span>
      ))}
      <span className="ml-auto flex items-center gap-2 rounded-lg px-2.5 py-2 text-slate-400">
        <Icon name="search" size={18} />
        <kbd className="rounded border border-slate-700 px-1.5 font-sans text-xs text-slate-500">⌘K</kbd>
      </span>
    </div>
  );
}

export function Menu(p: SceneProps) {
  const open = latest(p, MENU_CUES) as SectionGroup | null;
  const items = open ? sectionsIn(open).slice(0, 7) : [];
  const notesLit = past(p, "notes");
  const left = open ? 182 + MENU_CUES.indexOf(open) * 96 : 0;
  return (
    <div className="h-full">
      <NavBar open={open} />
      {open ? (
        <div key={open} className="absolute top-[74px] w-[420px] animate-[intro-drop_0.3s_ease-out] rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl" style={{ left }}>
          {items.map((s) => {
            const lit = NAMED[open].includes(s.label) && (s.label !== "Notes creator" || notesLit);
            return (
              <div key={s.href + s.label} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${lit ? "bg-sky-500/15" : ""}`}>
                <Icon name={s.icon as IconName} size={18} className={lit ? "text-sky-300" : "text-slate-500"} />
                <span className="min-w-0">
                  <span className={`block text-[15px] ${lit ? "text-sky-100" : "text-slate-200"}`}>{s.label}</span>
                  <span className="block truncate text-xs text-slate-500">{s.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-40 text-center text-4xl text-slate-300">Four menus, one for each part</p>
      )}
    </div>
  );
}

/* ---------- 3. AI practice plan ---------- */

const PLAN_STEPS = [
  { cue: "answer", n: 1, label: "Answer a few questions", icon: "list" as IconName },
  { cue: "send", n: 2, label: "Send your prompt to an AI", icon: "copy" as IconName },
  { cue: "paste", n: 3, label: "Paste your AI's reply", icon: "sparkles" as IconName },
];
const STAR_WORDS = ["Can't do it yet", "", "Same again next time", "", "Easy now"];

export function Plan(p: SceneProps) {
  const week = past(p, "week");
  const rated = past(p, "rate") ? 3 : 0;
  return (
    <div className="flex h-full flex-col px-14 py-10">
      <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-violet-300"><Icon name="sparkles" size={16} /> AI practice plan</p>
      {!week ? (
        <div className="mt-10 grid gap-4">
          {PLAN_STEPS.map((s) => {
            const on = past(p, s.cue);
            return (
              <div key={s.cue} className={`flex items-center gap-5 rounded-2xl border px-6 py-5 transition duration-500 ${on ? "border-violet-400/60 bg-violet-500/10" : "border-slate-800 bg-slate-900/60 opacity-50"}`}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold ${on ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400"}`}>{s.n}</span>
                <span className="text-2xl text-slate-100">{s.label}</span>
                <Icon name={s.icon} size={24} className={`ml-auto ${on ? "text-violet-300" : "text-slate-600"}`} />
              </div>
            );
          })}
          <div className={fade(past(p, "paste"), "mt-2 self-end rounded-xl bg-violet-500 px-6 py-3 text-lg font-medium text-white")}>Build my plan</div>
        </div>
      ) : (
        <div className="mt-6 animate-[intro-drop_0.4s_ease-out]">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <span key={d} className={`flex h-11 w-20 items-center justify-center rounded-xl border text-sm ${d === 1 ? "border-violet-400 bg-violet-500/20 text-violet-100" : d > 2 ? "border-dashed border-slate-700 text-slate-500" : "border-slate-700 text-slate-300"}`}>Day {d}</span>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border-l-4 border-amber-400 bg-slate-900 p-6">
            <p className="text-3xl text-slate-50">Em to Am, clean and in time</p>
            <p className="mt-1 text-sm text-slate-500">#guitar #chords #beginner</p>
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white"><Icon name="play" size={18} /></span>
              <span className="text-lg text-slate-200">Metronome</span>
              <span className="text-lg text-slate-400">70 bpm</span>
              <span className="ml-auto flex gap-3">
                {["Em", "Am"].map((c) => <span key={c} className="rounded-lg border border-slate-700 px-4 py-2 text-lg text-slate-200">{c}</span>)}
              </span>
            </div>
            <div className={fade(past(p, "rate"), "mt-5 flex items-center gap-4")}>
              <span className="text-slate-400">How did it go?</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon key={n} name="star" size={26} fill={n <= rated} className={n <= rated ? "text-amber-300" : "text-slate-600"} />
                ))}
              </span>
              <span className="text-amber-200">{rated ? STAR_WORDS[rated - 1] : ""}</span>
            </div>
            <p className={fade(past(p, "next"), "mt-3 text-slate-400")}>Your next plan is written with this in mind.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 4. notes creator ---------- */

/** Minor pentatonic position 1, from `npm run theory -- positions A minor pentatonic`: [string 6→1, fret, is the root]. */
const A_PENT: [number, number, boolean][] = [
  [6, 5, true], [6, 8, false], [5, 5, false], [5, 7, false], [4, 5, false], [4, 7, true],
  [3, 5, false], [3, 7, false], [2, 5, false], [2, 8, false], [1, 5, true], [1, 8, false],
];
/** C minor pentatonic position 1 is the same shape three frets up (frets 8 to 11, per the calculator). */
const SHIFT = { A: 0, C: 3 } as const;

function Neck({ shift }: { shift: number }) {
  const first = 3, frets = 12, w = 600, h = 120, fw = w / frets;
  const y = (s: number) => 12 + ((s - 1) * (h - 24)) / 5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {Array.from({ length: frets + 1 }, (_, i) => <line key={i} x1={i * fw} x2={i * fw} y1={y(1)} y2={y(6)} stroke="rgb(71 85 105)" strokeWidth={2} />)}
      {[1, 2, 3, 4, 5, 6].map((s) => <line key={s} x1={0} x2={w} y1={y(s)} y2={y(s)} stroke="rgb(148 163 184)" strokeWidth={1 + s * 0.25} />)}
      {[5, 7, 9].map((f) => <circle key={f} cx={(f - first + 0.5) * fw} cy={h / 2} r={4} fill="rgb(51 65 85)" />)}
      {A_PENT.map(([s, f, root], i) => (
        <circle
          key={i}
          cx={(f + shift - first + 0.5) * fw}
          cy={y(s)}
          r={10}
          fill={root ? "#ef4444" : "#3b82f6"}
          style={{ transition: "cx 0.7s cubic-bezier(.5,0,.2,1)" }}
        />
      ))}
    </svg>
  );
}

function Cell({ on, children, label }: { on: boolean; children: ReactNode; label: string }) {
  return (
    <div className={fade(on, "flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5")}>
      <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  );
}

export function Notes(p: SceneProps) {
  const key = past(p, "key") ? "C" : "A";
  const chords = key === "A" ? ["Am", "Dm", "Em"] : ["Cm", "Fm", "Gm"];
  const palette = past(p, "slash") && !past(p, "key");
  return (
    <div className="relative h-full px-12 py-8">
      <div className="flex items-center gap-3">
        <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-emerald-300"><Icon name="file-text" size={16} /> Notes creator</p>
        <span className="ml-auto rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400">Add a widget <kbd className="ml-1 rounded border border-slate-700 px-1 text-xs">/</kbd></span>
      </div>
      <div className="mt-4 flex items-baseline gap-4">
        <span className="text-3xl text-slate-50">Blues licks</span>
        <span className={`rounded-lg border px-3 py-1 text-lg transition ${past(p, "key") ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300"}`}>Key {key}</span>
        <span className="rounded-lg border border-slate-700 px-3 py-1 text-lg text-slate-300">Minor pentatonic</span>
      </div>
      <div className="mt-4 grid gap-2.5">
        <Cell on={past(p, "text")} label="Text"><span className="text-lg text-slate-200">Play position 1 slowly, then over the backing.</span></Cell>
        <Cell on={past(p, "neck")} label="Scale"><Neck shift={SHIFT[key]} /></Cell>
        <Cell on={past(p, "chords")} label="Chords">
          <span className="flex gap-3">{chords.map((c) => <span key={c} className="w-16 rounded-lg border border-slate-700 py-1.5 text-center text-lg text-slate-100 transition">{c}</span>)}</span>
        </Cell>
        <Cell on={past(p, "melody")} label="Melody">
          <span className="flex items-center gap-3 text-slate-300"><Icon name="music" size={20} className="text-sky-300" /> Melody · {key} minor · alto</span>
        </Cell>
      </div>
      <div className={fade(palette, "absolute left-1/2 top-24 w-[440px] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl")}>
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 pb-2 pt-1 text-slate-500"><Icon name="search" size={16} /> Add a widget</div>
        {["Scale", "CAGED", "Arpeggio", "Chord shapes", "Melody", "Video"].map((r, i) => (
          <div key={r} className={`rounded-lg px-3 py-1.5 text-[15px] ${i === 0 ? "bg-sky-500/15 text-sky-100" : "text-slate-300"}`}>{r}</div>
        ))}
      </div>
      <div className={fade(past(p, "follow"), "absolute bottom-6 right-12 text-lg text-sky-200")}>Every widget moves to the new key</div>
    </div>
  );
}

/* ---------- 5. help ---------- */

export function Help(p: SceneProps) {
  const tour = past(p, "tour") && !past(p, "hints");
  const hints = past(p, "hints");
  const exercise = past(p, "exercise");
  return (
    <div className="relative h-full px-14 py-12">
      <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Guitar</p>
      <div className="mt-1 flex items-center gap-4">
        <h3 className="text-5xl text-slate-50">Scales</h3>
        <Ring on={past(p, "compass") && !hints}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-slate-200 ${!past(p, "tour") ? "animate-[intro-wobble_1.2s_ease-in-out_infinite]" : ""} border-slate-600 bg-slate-800`}><TourIcon size={16} /></span>
        </Ring>
        <Ring on={hints}>
          <span className={`flex h-9 items-center justify-center gap-1 rounded-full border text-sm font-semibold transition-all ${hints ? "w-16 border-sky-400 bg-sky-500/20 text-sky-200" : "w-9 border-slate-600 text-slate-400"}`}>? {hints && <span className="text-[11px] font-medium">Esc</span>}</span>
        </Ring>
      </div>
      <p className="mt-2 text-lg text-slate-400">Every mode, its chords and positions</p>

      <div className="mt-8 flex gap-3">
        {["Key", "Mode", "Positions"].map((c) => (
          <span key={c} className={`relative rounded-xl border px-5 py-3 text-lg ${(tour && c === "Key") || (past(p, "hover") && c === "Positions" && !exercise) ? "border-sky-400 text-sky-100" : "border-slate-700 text-slate-300"}`}>{c}</span>
        ))}
      </div>

      <div className={fade(tour, "absolute left-14 top-[290px] w-[380px] rounded-2xl border border-sky-400/50 bg-slate-900 p-5 shadow-2xl")}>
        <p className="text-xs uppercase tracking-wider text-sky-300">Show me around this page · 1 of 4</p>
        <p className="mt-2 text-lg text-slate-100">Pick the key here. Every neck on the page follows it.</p>
      </div>
      <div className={fade(hints && past(p, "hover") && !exercise, "absolute left-[250px] top-[290px] w-[300px] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl")}>
        <p className="font-medium text-slate-100">Positions</p>
        <p className="mt-1 text-slate-400">Shows the scale one hand position at a time.</p>
      </div>

      <div className={fade(exercise, "absolute bottom-10 right-14 w-[420px] rounded-2xl border border-slate-700 bg-slate-900 p-5")}>
        <div className="flex items-center gap-3">
          <Icon name="metronome" size={20} className="text-amber-300" />
          <span className="text-lg text-slate-100">Metronome</span>
          <Ring on={exercise} className="ml-auto">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-200"><TourIcon size={16} /></span>
          </Ring>
        </div>
        <p className="mt-3 text-right text-sm text-sky-200">How the metronome works</p>
      </div>
    </div>
  );
}

/* ---------- 6. keys ---------- */

const QUERY = "melo";

export function Keys(p: SceneProps) {
  const spotlight = past(p, "cmdk") && !past(p, "space");
  const typed = past(p, "type") ? QUERY.slice(0, Math.min(QUERY.length, Math.floor((p.local - p.at.type) / 0.18) + 1)) : "";
  const space = past(p, "space");
  const bigDown = past(p, "big") && p.local - p.at.big < 0.3;
  const numbers = past(p, "numbers");
  const cmdDown = past(p, "cmdk") && p.local - p.at.cmdk < 0.6;
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      {!space ? (
        <>
          <div className="flex gap-3">
            <Keycap down={cmdDown}>⌘</Keycap>
            <Keycap down={cmdDown}>K</Keycap>
          </div>
          <p className="text-xl text-slate-400">Open any page · Ctrl K on Windows</p>
          <div className={fade(spotlight, "w-[520px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl")}>
            <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-3.5 text-lg">
              <Icon name="search" size={18} className="text-slate-500" />
              {typed ? <span className="text-slate-100">{typed}<span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-sky-300 align-middle" /></span> : <span className="text-slate-500">Search pages, course, scales…</span>}
            </div>
            <div className="p-2">
              {typed ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl bg-sky-500/15 px-3 py-2"><Icon name="music" size={16} className="text-sky-300" /><span><span className="block text-sky-100">Sing melodies</span><span className="block text-xs text-slate-500">Short tunes that end on Do, easiest first</span></span></div>
                </>
              ) : (
                ["Course", "AI practice plan", "Scales"].map((l) => <div key={l} className="px-3 py-2 text-slate-300">{l}</div>)
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <Keycap wide down={bigDown}>Space</Keycap>
            <span className={`flex items-center gap-2 rounded-xl px-6 py-4 text-xl font-medium transition ${bigDown ? "scale-95 bg-sky-400" : "bg-sky-500"} text-white`}><Icon name="play" size={20} /> {past(p, "big") ? "Next" : "Start"}</span>
          </div>
          <p className="text-xl text-slate-400">Play and stop, or press the big button</p>
          <div className={fade(numbers, "flex items-center gap-3")}>
            <Icon name="ear" size={22} className="text-pink-300" />
            <span className="mr-2 text-lg text-slate-300">Ear training</span>
            {["1", "2", "3"].map((k, i) => <Keycap key={k} down={numbers && Math.floor((p.local - p.at.numbers) / 0.5) === i}>{k}</Keycap>)}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 7. end ---------- */

export function End(p: SceneProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      <Wordmark className="text-[5.5rem]" />
      <div className={fade(past(p, "cmdk"), "flex items-center gap-4 text-2xl text-slate-300")}>
        Press <Keycap>⌘</Keycap><Keycap>K</Keycap> to open any page
      </div>
    </div>
  );
}

export const SCENES: Record<string, (p: SceneProps) => ReactNode> = { hello: Hello, menu: Menu, plan: Plan, notes: Notes, help: Help, keys: Keys, end: End };
