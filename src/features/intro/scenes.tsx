"use client";

/**
 * The scenes of the two tours, drawn on a 960 × 540 stage the player scales to fit. Each scene is a pure function of `local`
 * (seconds into the scene) and `at` (its cue times), so seeking, pausing and the silent fallback all draw the same frame for
 * the same time. They are built from the app's own pieces (the wordmark, icons) drawn still, not the live pages: a tour must
 * not start the mic or the sound engine. A tour shows what is in the app; it names no price and sells nothing.
 */
import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import Wordmark from "@/components/Wordmark";

export type SceneProps = { local: number; at: Record<string, number> };

const past = (p: SceneProps, cue: string) => p.at[cue] !== undefined && p.local >= p.at[cue];

const fade = (on: boolean, extra = "") => `transition-all duration-500 ease-out ${on ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"} ${extra}`;

/** A card that lights when its cue has fired, and waits dimmed before. */
const lit = (on: boolean, tone = "border-sky-400/60 bg-sky-500/10") => `transition duration-500 ${on ? tone : "border-slate-800 bg-slate-900/60 opacity-50"}`;

function Label({ icon, tone, children }: { icon: IconName; tone: string; children: ReactNode }) {
  return <p className={`flex items-center gap-2 text-sm uppercase tracking-[0.18em] ${tone}`}><Icon name={icon} size={16} /> {children}</p>;
}

function Chip({ on = false, children }: { on?: boolean; children: ReactNode }) {
  return <span className={`rounded-lg border px-3 py-1 text-lg transition ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300"}`}>{children}</span>;
}

/** Minor pentatonic position 1, from `npm run theory -- positions A minor pentatonic`: [string 6→1, fret, is the root]. */
const A_PENT: [number, number, boolean][] = [
  [6, 5, true], [6, 8, false], [5, 5, false], [5, 7, false], [4, 5, false], [4, 7, true],
  [3, 5, false], [3, 7, false], [2, 5, false], [2, 8, false], [1, 5, true], [1, 8, false],
];

function Neck({ shift = 0, w = 600, h = 120 }: { shift?: number; w?: number; h?: number }) {
  const first = 3, frets = 12, fw = w / frets;
  const y = (s: number) => 12 + ((s - 1) * (h - 24)) / 5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {Array.from({ length: frets + 1 }, (_, i) => <line key={i} x1={i * fw} x2={i * fw} y1={y(1)} y2={y(6)} stroke="rgb(71 85 105)" strokeWidth={2} />)}
      {[1, 2, 3, 4, 5, 6].map((s) => <line key={s} x1={0} x2={w} y1={y(s)} y2={y(s)} stroke="rgb(148 163 184)" strokeWidth={1 + s * 0.25} />)}
      {[5, 7, 9].map((f) => <circle key={f} cx={(f - first + 0.5) * fw} cy={h / 2} r={4} fill="rgb(51 65 85)" />)}
      {A_PENT.map(([s, f, root], i) => (
        <circle key={i} cx={(f + shift - first + 0.5) * fw} cy={y(s)} r={h / 12} fill={root ? "#ef4444" : "#3b82f6"} style={{ transition: "cx 0.7s cubic-bezier(.5,0,.2,1)" }} />
      ))}
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={26} fill={i <= n} className={i <= n ? "text-amber-300" : "text-slate-600"} />)}
    </span>
  );
}

/* ================= The tour for solo musicians ================= */

export function SoloHello(p: SceneProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className={fade(true)}><Wordmark className="text-[7rem]" /></div>
      <p className={fade(past(p, "plan"), "text-3xl text-slate-300")}>A practice plan for every day</p>
      <div className={fade(past(p, "areas"), "flex items-center gap-3 text-lg text-slate-300")}>
        {([["guitar", "Guitar"], ["mic", "Singing"], ["ear", "Ear and theory"]] as [IconName, string][]).map(([n, label]) => (
          <span key={n} className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3"><Icon name={n} size={22} className="text-sky-300" /> {label}</span>
        ))}
      </div>
      <p className={fade(past(p, "browser"), "text-lg text-slate-400")}>In your browser</p>
    </div>
  );
}

const QUESTIONS: { cue: string; label: string; chips: string[]; picked: number }[] = [
  { cue: "what", label: "What do you play or sing?", chips: ["Guitar", "Voice", "Music theory"], picked: 0 },
  { cue: "where", label: "Where are you with it?", chips: ["New", "Beginner", "Intermediate", "Advanced"], picked: 1 },
  { cue: "minutes", label: "How many minutes a day?", chips: ["10", "20", "30"], picked: 1 },
];

export function SoloQuestions(p: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center px-14 py-10">
      <Label icon="list" tone="text-sky-300">A few questions</Label>
      <div className="mt-8 grid gap-4">
        {QUESTIONS.map((q) => {
          const on = past(p, q.cue);
          return (
            <div key={q.cue} className={`flex items-center gap-5 rounded-2xl border px-6 py-5 ${lit(on)}`}>
              <span className="text-2xl text-slate-100">{q.label}</span>
              <span className="ml-auto flex gap-2">{q.chips.map((c, i) => <Chip key={c} on={on && i === q.picked}>{c}</Chip>)}</span>
            </div>
          );
        })}
      </div>
      <p className={fade(past(p, "first"), "mt-6 self-end flex items-center gap-2 text-xl text-sky-200")}><Icon name="sparkles" size={20} /> Your first plan is ready</p>
    </div>
  );
}

const TODAY: { label: string; mins: number; tone: string }[] = [
  { label: "A minor pentatonic, position 1", mins: 10, tone: "bg-teal-400" },
  { label: "Intervals by ear: 3rds and 5ths", mins: 5, tone: "bg-sky-400" },
  { label: "Sing the scale over a drone", mins: 5, tone: "bg-rose-400" },
];
const TODAY_MINUTES = TODAY.reduce((s, x) => s + x.mins, 0);

export function SoloToday(p: SceneProps) {
  const long = past(p, "long");
  return (
    <div className="flex h-full flex-col justify-center px-14 py-10">
      <Label icon="sparkles" tone="text-sky-300">Practice plan</Label>
      <div className={fade(past(p, "ready"), "mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6")}>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl text-slate-50">Today</p>
          <p className={`text-xl transition ${long ? "text-sky-200" : "text-slate-500"}`}>{TODAY_MINUTES} min</p>
        </div>
        <ul className="mt-5 grid gap-3">
          {TODAY.map((x) => (
            <li key={x.label} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-3.5">
              <span className={`h-8 w-1.5 rounded-full ${x.tone}`} />
              <span className="flex-1 text-xl text-slate-100">{x.label}</span>
              <span className={`text-lg transition ${long ? "text-sky-200" : "text-slate-500"}`}>{x.mins} min</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex items-center justify-between text-lg">
        <span className={fade(past(p, "library"), "text-slate-300")}>Put together from attunr&apos;s library of exercises</span>
        <span className={fade(past(p, "different"), "text-sky-200")}>A bit different every day</span>
      </div>
    </div>
  );
}

/** Two bars of tab from position 1 above: the low two strings, frets 5 and 8, then 5 and 7. */
function Tab() {
  const w = 380, h = 110;
  const y = (s: number) => 10 + ((s - 1) * (h - 20)) / 5;
  const notes: [number, number, number][] = [[6, 5, 60], [6, 8, 140], [5, 5, 220], [5, 7, 300]];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((s) => <line key={s} x1={0} x2={w} y1={y(s)} y2={y(s)} stroke="rgb(71 85 105)" strokeWidth={1.5} />)}
      {notes.map(([s, f, x]) => (
        <g key={x}>
          <rect x={x - 11} y={y(s) - 11} width={22} height={22} fill="rgb(15 23 42)" />
          <text x={x} y={y(s) + 6} textAnchor="middle" fontSize={18} fill="rgb(226 232 240)">{f}</text>
        </g>
      ))}
    </svg>
  );
}

/** A staff with the singer's line: a pitch that settles on a note. */
function Staff() {
  const w = 380, h = 110;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={0} x2={w} y1={25 + i * 15} y2={25 + i * 15} stroke="rgb(71 85 105)" strokeWidth={1.5} />)}
      <path d="M10 92 C 60 88, 90 58, 140 56 S 230 54, 260 40 S 330 38, 370 39" fill="none" stroke="#fb7185" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

function Tile({ on, title, children }: { on: boolean; title: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-5 ${lit(on)}`}>
      <p className="text-lg text-slate-200">{title}</p>
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

export function SoloExercise(p: SceneProps) {
  return (
    <div className="flex h-full flex-col px-12 py-8">
      <Label icon="play" tone="text-teal-300">Play, sing or hear</Label>
      <div className="mt-5 grid flex-1 grid-cols-2 gap-4">
        <Tile on={past(p, "neck")} title="A guitar neck shows the notes"><Neck w={380} h={100} /></Tile>
        <Tile on={past(p, "tab")} title="A tab scrolls as you play"><Tab /></Tile>
        <Tile on={past(p, "staff")} title="The staff draws your voice"><Staff /></Tile>
        <Tile on={past(p, "band")} title="A backing track plays under you">
          <span className="flex gap-4">
            {(["drum", "guitar", "music"] as IconName[]).map((n) => (
              <span key={n} className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60 text-violet-300"><Icon name={n} size={30} /></span>
            ))}
          </span>
        </Tile>
      </div>
    </div>
  );
}

export function SoloRate(p: SceneProps) {
  const stars = past(p, "high") ? 5 : past(p, "low") ? 1 : 0;
  return (
    <div className="flex h-full flex-col justify-center px-14 py-10">
      <Label icon="star" tone="text-amber-300">After each exercise</Label>
      <div className="mt-6 rounded-2xl border-l-4 border-amber-400 bg-slate-900 p-6">
        <p className="text-3xl text-slate-50">A minor pentatonic, position 1</p>
        <div className={fade(past(p, "rate"), "mt-5 flex items-center gap-4")}>
          <span className="text-lg text-slate-400">How did it go?</span>
          <Stars n={stars} />
          <span className="text-lg text-amber-200">{stars === 1 ? "Can't do it yet" : stars === 5 ? "Easy now" : ""}</span>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className={`rounded-2xl border px-6 py-5 ${lit(past(p, "next"))}`}>
          <p className="text-sm uppercase tracking-wider text-sky-300">The next plan</p>
          <p className="mt-1 text-2xl text-slate-100">The next thing to learn</p>
        </div>
        <div className={`rounded-2xl border px-6 py-5 ${lit(past(p, "mix"), "border-teal-400/60 bg-teal-500/10")}`}>
          <p className="text-sm uppercase tracking-wider text-teal-300">Mixed back in</p>
          <p className="mt-1 text-2xl text-slate-100">A little of what feels solid</p>
        </div>
      </div>
    </div>
  );
}

const HABIT: { cue: string; icon: IconName; title: string; line: string }[] = [
  { cue: "reminder", icon: "bell", title: "A daily reminder", line: "At the time you choose" },
  { cue: "timer", icon: "timer", title: "A timer", line: "For the day's practice" },
  { cue: "streak", icon: "check", title: "A day streak", line: "The days you practice" },
];

export function SoloHabit(p: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center px-14 py-10">
      <Label icon="repeat" tone="text-violet-300">A daily habit</Label>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {HABIT.map((x) => {
          const on = past(p, x.cue);
          return (
            <div key={x.cue} className={`flex flex-col gap-3 rounded-2xl border p-6 ${lit(on, "border-violet-400/60 bg-violet-500/10")}`}>
              <Icon name={x.icon} size={30} className={on ? "text-violet-300" : "text-slate-600"} />
              <p className="text-2xl text-slate-100">{x.title}</p>
              <p className="text-lg text-slate-400">{x.line}</p>
            </div>
          );
        })}
      </div>
      <p className={fade(past(p, "points"), "mt-10 text-center text-2xl text-slate-400")}>No points. No score.</p>
    </div>
  );
}

/** The closing frame: the wordmark and one line per thing the tour showed, lit as it is named. */
function Recap({ p, items }: { p: SceneProps; items: { cue: string; icon: IconName; text: string }[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <Wordmark className="text-[5.5rem]" />
      <div className="flex gap-4 text-xl">
        {items.map((x) => (
          <span key={x.cue} className={fade(past(p, x.cue), "flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-slate-200")}>
            <Icon name={x.icon} size={20} className="text-sky-300" /> {x.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SoloEnd(p: SceneProps) {
  return (
    <Recap p={p} items={[
      { cue: "plan", icon: "list", text: "Today's plan" },
      { cue: "tools", icon: "play", text: "Exercises that play along" },
      { cue: "next", icon: "star", text: "The next step from your ratings" },
    ]} />
  );
}

/* ================= The tour for teachers and schools ================= */

export function TeachHello(p: SceneProps) {
  const items: { cue: string; icon: IconName; text: string }[] = [
    { cue: "week", icon: "list", text: "A week of practice" },
    { cue: "path", icon: "network", text: "A learning path" },
    { cue: "progress", icon: "activity", text: "How every exercise went" },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className={fade(true)}><Wordmark className="text-[7rem]" /></div>
      <p className={fade(past(p, "tagline"), "text-3xl text-slate-300")}>For music teachers</p>
      <div className="flex items-center gap-4 text-xl text-slate-200">
        {items.map((x) => (
          <span key={x.cue} className={fade(past(p, x.cue), "flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3")}><Icon name={x.icon} size={22} className="text-sky-300" /> {x.text}</span>
        ))}
      </div>
    </div>
  );
}

export function TeachStudent(p: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center px-14 py-10">
      <Label icon="graduation-cap" tone="text-sky-300">Students</Label>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-6 ${lit(past(p, "name"))}`}>
          <p className="text-sm uppercase tracking-wider text-slate-500">Add a student</p>
          <p className="mt-3 rounded-lg border border-slate-700 px-4 py-2.5 text-xl text-slate-100">Ben</p>
          <p className="mt-2 rounded-lg border border-slate-700 px-4 py-2.5 text-xl text-slate-400">ben@example.com</p>
        </div>
        <div className={`rounded-2xl border p-6 ${lit(past(p, "answers"))}`}>
          <p className="text-sm uppercase tracking-wider text-slate-500">A few questions</p>
          <p className="mt-3 text-xl text-slate-100">What do they play or sing?</p>
          <p className="mt-2 flex gap-2"><Chip on>Guitar</Chip><Chip>Voice</Chip></p>
          <p className="mt-3 text-xl text-slate-100">Where are they with it?</p>
          <p className="mt-2 flex gap-2"><Chip>New</Chip><Chip on>Beginner</Chip></p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4 text-xl">
        <span className={fade(past(p, "link"), "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-slate-200")}><Icon name="message-circle" size={20} className="text-teal-300" /> A link goes to Ben by email</span>
        <span className={fade(past(p, "week"), "text-sky-200")}>Ben&apos;s first week is ready</span>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** The days Ben doesn't practice: the teacher turns them off and those days stay empty. */
const OFF_DAYS = [2, 6];

export function TeachWeek(p: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center px-14 py-8">
      <Label icon="sparkles" tone="text-sky-300">Ben&apos;s week</Label>
      <div className={fade(past(p, "week"), "mt-4 flex gap-2")}>
        {WEEKDAYS.map((d, i) => {
          const off = past(p, "days") && OFF_DAYS.includes(i);
          return <span key={d} className={`flex h-11 w-20 items-center justify-center rounded-xl border text-sm transition duration-500 ${off ? "border-slate-800 text-slate-600 line-through" : i === 0 ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300"}`}>{d}</span>;
        })}
        <span className={fade(past(p, "library"), "ml-auto self-center text-lg text-slate-400")}>From attunr&apos;s library</span>
      </div>
      <div className={fade(past(p, "exact"), "mt-5 rounded-2xl border-l-4 border-amber-400 bg-slate-900 p-6")}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-2 text-3xl text-slate-50">Minor pentatonic</p>
          <Chip on={past(p, "key")}>Key A</Chip>
          <Chip on={past(p, "position")}>Position 1</Chip>
        </div>
        <div className={`mt-5 transition duration-500 ${past(p, "scale") ? "opacity-100" : "opacity-30"}`}><Neck w={760} h={150} /></div>
      </div>
    </div>
  );
}

/** A teacher's sliders: a topic, where it sat at the start of the week, and where the teacher puts it. 0 to 3: New, Beginner, Intermediate, Advanced. */
const SLIDERS: { topic: string; from: number; to: number }[] = [
  { topic: "Basic chords", from: 1.2, to: 1.8 },
  { topic: "Barre chords", from: 0.4, to: 0.6 },
  { topic: "Techniques", from: 1.0, to: 1.0 },
];
const LEVELS = ["New", "Beginner", "Intermediate", "Advanced"];

export function TeachNext(p: SceneProps) {
  const moved = past(p, "sliders");
  return (
    <div className="flex h-full flex-col justify-center px-14 py-8">
      <Label icon="sliders-horizontal" tone="text-sky-300">Next plan</Label>
      <div className={fade(past(p, "rate"), "mt-4 flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4")}>
        <span className="text-xl text-slate-100">How it went for Ben</span>
        <Stars n={4} />
        <span className="ml-auto text-lg text-slate-400">Em to Am, clean and in time</span>
      </div>
      <div className={`mt-4 rounded-2xl border p-6 ${lit(moved)}`}>
        <div className="grid gap-5">
          {SLIDERS.map((s) => {
            const v = moved ? s.to : s.from;
            return (
              <div key={s.topic} className="flex items-center gap-5">
                <span className="w-40 text-xl text-slate-100">{s.topic}</span>
                <span className="relative h-2 flex-1 rounded-full bg-slate-800">
                  <span className="absolute left-0 top-0 h-2 rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${(v / 3) * 100}%` }} />
                  <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-slate-400" style={{ left: `${(s.from / 3) * 100}%` }} />
                  <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-slate-950 transition-all duration-700" style={{ left: `${(v / 3) * 100}%` }} />
                </span>
              </div>
            );
          })}
        </div>
        <div className="ml-45 mt-4 flex justify-between text-sm text-slate-500">{LEVELS.map((l) => <span key={l}>{l}</span>)}</div>
      </div>
      <div className={fade(past(p, "next"), "mt-4 self-end rounded-xl bg-sky-500 px-6 py-3 text-lg font-medium text-white")}>Make next week&apos;s plan</div>
    </div>
  );
}

/** A step on the learning path as /admin/content/path draws it, and where Ben is on it: solid, being worked on, or still ahead. */
type PathStep = { text: string; state: "solid" | "working" | "ahead" };
/** Three guitar skills of the path, a block per level (New, Beginner, Intermediate), the steps as the path names them. */
const PATH_ROWS: { skill: string; levels: (PathStep[] | null)[] }[] = [
  {
    skill: "Notes on the neck",
    levels: [
      [{ text: "E and A, frets 0 to 5", state: "solid" }],
      [{ text: "E and A, frets 0 to 12", state: "working" }],
      [{ text: "Every string, frets 0 to 12", state: "ahead" }],
    ],
  },
  {
    skill: "Intervals on the neck",
    levels: [
      null,
      [{ text: "Octaves", state: "solid" }, { text: "5ths and 4ths", state: "ahead" }],
      [{ text: "3rds and 6ths", state: "ahead" }, { text: "Up and down from one note", state: "ahead" }],
    ],
  },
  {
    skill: "Pentatonic positions",
    levels: [
      null,
      [{ text: "Position 1, minor", state: "solid" }, { text: "Position 1, major", state: "working" }, { text: "Position 2", state: "ahead" }],
      [{ text: "Joining 1 and 2", state: "ahead" }, { text: "Positions 3, 4, 5", state: "ahead" }],
    ],
  },
];
const PATH_LEVELS = [
  { name: "New", tint: "border-t-emerald-400" },
  { name: "Beginner", tint: "border-t-sky-400" },
  { name: "Intermediate", tint: "border-t-violet-400" },
];

function StepMark({ state, shown }: { state: PathStep["state"]; shown: boolean }) {
  const fill = !shown || state === "ahead" ? "border-slate-500 bg-transparent" : state === "solid" ? "border-emerald-400 bg-emerald-400" : "border-amber-400 bg-amber-400";
  return <span className={`mt-1.5 inline-block size-3 shrink-0 rounded-[3px] border transition-colors duration-500 ${fill}`} />;
}

export function TeachPath(p: SceneProps) {
  const student = past(p, "student");
  const shown = (s: PathStep["state"]) => student && ((s === "solid" && past(p, "solid")) || (s === "working" && past(p, "working")));
  const dim = (s: PathStep["state"]) => s === "ahead" && past(p, "ahead");
  return (
    <div className="flex h-full flex-col px-10 py-7">
      <div className="flex items-center">
        <Label icon="network" tone="text-amber-300">Learning path · Guitar</Label>
        <span className={fade(student, "ml-auto rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-base text-slate-200")}>Student on the path: Ben</span>
      </div>
      <div className="mt-4 grid grid-cols-[150px_1fr_1fr_1fr] gap-2.5">
        <span />
        {PATH_LEVELS.map((l, i) => (
          <div key={l.name} className={`rounded-lg border border-slate-700 border-t-2 ${l.tint} bg-slate-900 px-3 py-1.5 transition duration-500 ${past(p, "levels") || i === 0 ? "opacity-100" : "opacity-30"}`}>
            <p className="text-base text-slate-100">{l.name}</p>
            <p className="text-xs text-slate-500">level {i + 1} of 4</p>
          </div>
        ))}
        {PATH_ROWS.map((row) => (
          <div key={row.skill} className="contents">
            <p className="self-center text-base text-slate-300">{row.skill}</p>
            {row.levels.map((steps, i) => steps ? (
              <div key={i} className={`rounded-xl border border-amber-400/50 bg-slate-900/80 px-3 py-2 transition duration-500 ${past(p, "levels") || i === 0 ? "opacity-100" : "opacity-30"}`}>
                <p className="text-sm text-amber-200">{row.skill}{i > 0 && row.levels[i - 1] && <span className="text-slate-500"> cont.</span>}</p>
                {steps.map((st) => (
                  <p key={st.text} className={`mt-1 flex gap-2 text-sm transition duration-500 ${dim(st.state) ? "text-slate-500" : "text-slate-200"}`}>
                    <StepMark state={st.state} shown={shown(st.state)} /> {st.text}
                  </p>
                ))}
              </div>
            ) : <span key={i} />)}
          </div>
        ))}
      </div>
      <div className="mt-auto flex gap-6 pt-3 text-base">
        <span className={fade(past(p, "solid"), "flex items-center gap-2 text-emerald-200")}><span className="size-3 rounded-[3px] bg-emerald-400" /> Solid</span>
        <span className={fade(past(p, "working"), "flex items-center gap-2 text-amber-200")}><span className="size-3 rounded-[3px] bg-amber-400" /> Being worked on</span>
        <span className={fade(past(p, "ahead"), "flex items-center gap-2 text-slate-400")}><span className="size-3 rounded-[3px] border border-slate-500" /> Ahead</span>
      </div>
    </div>
  );
}

/** Ben's last ratings, newest first, 1 to 5 stars. */
const RATED: { title: string; stars: number }[] = [
  { title: "Position 1, major", stars: 3 },
  { title: "E and A, frets 0 to 12", stars: 2 },
  { title: "Octaves", stars: 4 },
];
/** Ben's skills, 0 to 1 of the way from New to Advanced. */
const SKILLS: { skill: string; v: number }[] = [
  { skill: "Notes on the neck", v: 0.42 },
  { skill: "Intervals on the neck", v: 0.22 },
  { skill: "Pentatonic positions", v: 0.3 },
];
const PICKS: { cue: string; title: string; items: string[]; tone: string }[] = [
  { cue: "reach", title: "Within reach", items: ["Position 1, major", "5ths and 4ths", "E and A, frets 0 to 12"], tone: "border-sky-400/60 bg-sky-500/10 text-sky-200" },
  { cue: "back", title: "Now and then", items: ["Position 1, minor", "Octaves"], tone: "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" },
  { cue: "wait", title: "Later", items: ["Joining 1 and 2", "3rds and 6ths"], tone: "border-slate-700 bg-slate-900/60 text-slate-400" },
];

export function TeachProgress(p: SceneProps) {
  return (
    <div className="flex h-full flex-col px-10 py-7">
      <Label icon="activity" tone="text-sky-300">Ben&apos;s progress</Label>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 ${lit(past(p, "rating"), "border-amber-400/50 bg-slate-900")}`}>
          <p className="text-sm uppercase tracking-wider text-slate-500">Ratings</p>
          {RATED.map((r) => (
            <div key={r.title} className="mt-2 flex items-center gap-3">
              <span className="flex-1 text-base text-slate-100">{r.title}</span>
              <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={15} fill={i <= r.stars} className={i <= r.stars ? "text-amber-300" : "text-slate-600"} />)}</span>
            </div>
          ))}
        </div>
        <div className={`rounded-2xl border p-4 ${lit(past(p, "skills"))}`}>
          <p className="text-sm uppercase tracking-wider text-slate-500">Skill by skill</p>
          {SKILLS.map((s) => (
            <div key={s.skill} className="mt-2.5 flex items-center gap-3">
              <span className="w-44 text-base text-slate-100">{s.skill}</span>
              <span className="relative h-2 flex-1 rounded-full bg-slate-800">
                <span className="absolute left-0 top-0 h-2 rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${(past(p, "skills") ? s.v : 0) * 100}%` }} />
              </span>
            </div>
          ))}
          <p className={fade(past(p, "time"), "mt-3 flex gap-5 text-base text-slate-300")}>
            <span className="flex items-center gap-1.5"><Icon name="check" size={16} className="text-violet-300" /> 12 days</span>
            <span className="flex items-center gap-1.5"><Icon name="timer" size={16} className="text-violet-300" /> 3 h 40 min</span>
          </p>
        </div>
      </div>
      <p className={fade(past(p, "reach"), "mt-5 text-sm uppercase tracking-wider text-slate-500")}>What the next plan picks</p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {PICKS.map((x) => (
          <div key={x.cue} className={fade(past(p, x.cue), `rounded-2xl border px-4 py-3 ${x.tone}`)}>
            <p className="text-base">{x.title}</p>
            {x.items.map((i) => <p key={i} className="mt-1 text-sm text-slate-300">{i}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeachEnd(p: SceneProps) {
  return (
    <Recap p={p} items={[
      { cue: "week", icon: "list", text: "A week of practice" },
      { cue: "path", icon: "network", text: "The learning path" },
      { cue: "progress", icon: "activity", text: "Progress, skill by skill" },
    ]} />
  );
}

export const SCENES: Record<string, (p: SceneProps) => ReactNode> = {
  "solo-hello": SoloHello, "solo-questions": SoloQuestions, "solo-today": SoloToday, "solo-exercise": SoloExercise,
  "solo-rate": SoloRate, "solo-habit": SoloHabit, "solo-end": SoloEnd,
  "teach-hello": TeachHello, "teach-student": TeachStudent, "teach-week": TeachWeek, "teach-next": TeachNext,
  "teach-path": TeachPath, "teach-progress": TeachProgress, "teach-end": TeachEnd,
};
