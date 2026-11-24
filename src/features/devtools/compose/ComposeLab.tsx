"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Select } from "@/components/ui";
import { MINUTES, levelOf } from "@/features/plan/intake/answers";
import { topicById } from "@/features/plan/intake/topics";
import { AREAS } from "@/features/plan/model/concepts";
import type { ComposeTrace, PickReason, PickStage } from "@/features/plan/model/compose";
import { shownTitle, type Given } from "@/features/plan/model/moves";
import { ROLL } from "@/features/plan/model/roll";
import { KEY_LADDERS, KEY_RUNGS, hasKeySelector, keyRung, keysAt, type KeyRung } from "@/features/plan/model/keys";
import { stepAt } from "@/features/plan/model/path";
import { keyName } from "@/features/theory/keySlug";
import { nextVersion, seedCandidates, simulate, type LabRating } from "../model/composeLab";
import { PERSONAS } from "../model/personas";
import Architecture, { C } from "./Architecture";

/*
 * /dev/compose: how a day's plan is built, stage by stage, for a made-up player over the seed blocks in the code. The
 * composer is the real one (`explainDay`); see ../model/composeLab.ts for what is stood in. The second view,
 * "Architecture" (./Architecture.tsx), is how the algorithm is put together: callers, inputs, the calls inside.
 */

const LINES = ["Not yet", "Beginner", "Intermediate", "Advanced"];
const RUNG_NAMES: Record<KeyRung, string> = { 0: "One key", 1: "Two or three keys", 2: "The common keys", 3: "Most keys", 4: "Any key" };
const STAGE_STYLE: Record<PickStage, string> = {
  review: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  fresh: "border-sky-400/60 bg-sky-500/15 text-sky-100",
  open: "border-dashed border-slate-500 text-slate-300",
  more: "border-violet-400/50 bg-violet-500/10 text-violet-200",
  "more review": "border-emerald-500/30 text-emerald-300/80",
};
/** The five passes of `fill`, in the order they run: the name on the chip. */
const STAGE_LABEL: Record<PickStage, string> = { review: "1 planned review", fresh: "2 fresh", open: "3 open", more: "4 more", "more review": "5 more review" };
const STAGE_NOTE: Record<PickStage, string> = {
  review: "Pass 1, planned review: a block for the solid step that was rated longest ago. Picked first so it is sure of its minutes, but placed last in the day.",
  fresh: "Pass 2, fresh: one block for each fresh step, in the order of the Fresh list of stage 2.",
  open: "Pass 3, open: one block for each open step, in the order of the Open list of stage 2.",
  more: "Pass 4, more: a second, third... block for the steps that got one in passes 2 and 3, one step after the other, until the minutes are full.",
  "more review": "Pass 5, more review: only when minutes are still left after pass 4. More blocks for the solid steps.",
};
const REASON: Record<PickReason, string> = {
  low: "The player's newest rating of this choice is under Solid (1 to 3 stars), so it comes back until it is solid. With several such choices, the one rated most recently.",
  unrated: "The player has never rated this choice. Picked at random among the unrated choices that all players have used least.",
  solid: "Every choice that fits this step is already rated Solid (4 or 5 stars), so the one rated longest ago comes back.",
};
/** What a roll decided, in words. */
const OUTCOME = { first: "first play", back: "back to the version before", same: "the same version again", move: "one move" } as const;
const keys = (list: number[]) => list.map((k) => keyName(k)).join(" ");
const pct = (n: number) => `${Math.round(n * 100)}%`;
const PART_NAME = { key: "key", bpm: "tempo" } as const;
/** A version in words: "A G · earlier E · 70 bpm · earlier 60". */
const version = (g: Given) => [
  g.keys ? keys(g.keys.now) : "", g.keys?.back.length ? `earlier ${keys(g.keys.back)}` : "",
  g.bpm ? `${g.bpm.now} bpm` : "", g.bpm?.back.length ? `earlier ${g.bpm.back.join(" ")}` : "",
].filter(Boolean).join(" · ") || "as written";

function stepName(ref: string): string {
  const at = stepAt(ref);
  return at ? `${at.track.label} ${at.index + 1}: ${at.step.name}` : ref;
}

function StepChip({ refId, tone = "border-slate-700 text-slate-300" }: { refId: string; tone?: string }) {
  return <span title={stepName(refId)} className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${tone}`}>{refId}</span>;
}

/** A word the page explains, where it is explained. */
const T = ({ children }: { children: ReactNode }) => <b className="font-semibold text-slate-200">{children}</b>;
const LIST = "flex list-disc flex-col gap-1 pl-5";
const STEPS = "flex list-decimal flex-col gap-1 pl-5";

function WordList({ rows, mono }: { rows: [string, ReactNode][]; mono?: boolean }) {
  return (
    <dl className="mt-3 grid max-w-4xl gap-x-5 gap-y-2 text-xs leading-relaxed text-slate-400 desk:grid-cols-[max-content_1fr]">
      {rows.map(([word, meaning]) => (
        <div key={word} className="contents">
          <dt className={mono ? "font-mono text-[11px] text-slate-200" : "font-semibold text-slate-200"}>{word}</dt>
          <dd>{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The words the stages use, each said once in full: the stages below lean on them. Then the data shapes, by their names in the code. */
function Words() {
  return (
    <details open className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-100">Words used on this page</summary>
      <WordList rows={WORDS} />
      <h3 className="mt-5 text-xs font-semibold text-slate-100">The data, by its name in the code</h3>
      <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-400">What the composer takes, what it gives back and what this page reads. The types are in <C>plan/model/compose.ts</C>, <C>moves.ts</C>, <C>roll.ts</C> and <C>daySteps.ts</C>; the Architecture view shows who fills each one.</p>
      <WordList rows={SHAPES} mono />
    </details>
  );
}
const WORDS: [string, ReactNode][] = [
  ["Area", "Guitar, voice, or theory & ear. A player picks the areas they practise in the first questionnaire."],
  ["Path, track, step", <>The path is everything the app teaches. It is split into tracks: one skill each, such as one scale shape family. A track is a list of steps, easiest first. A step is written <C>track-id:number</C>, so <C>some-track:3</C> is the third step of that track. A step can need other steps first, on its own track or on another.</>],
  ["Topic, line", "A topic is a group of tracks that the first questionnaire asks about with one question. The line is the answer the player picked for that topic: Not yet, Beginner, Intermediate or Advanced."],
  ["Block, choice", "A block is one exercise in the library. A block holds one or more choices: variants of the exercise, each with its own steps, level and minutes. The composer always picks a choice, and a day never holds two choices of the same block."],
  ["Rating, solid", "After playing, the player rates an exercise with 1 to 5 stars. A rating counts for the steps the exercise names. A step is solid when its newest rating is 4 stars or more, and so is a choice."],
  ["Known", "A step the player already has: the questionnaire answer places them above it, or it is solid, or a known step needs it first."],
  ["Within reach", "A step that is not known, where every step it needs first is known, and that its topic offers now. A topic offers only a few steps at once: 1 when its line is Not yet, 2 for Beginner, no limit from Intermediate."],
  ["Open", "A step that is ready in the same way (every step it needs first is known) but is over its topic's limit. It is not blocked, only ranked after the steps within reach."],
  ["Ahead", "A step that needs something the player does not know yet. No exercise for it is given."],
  ["Exercise version", <>The key or keys and the tempo one exercise opens in for one player. The exercise is the same; its exercise version changes with the player&apos;s ratings (stage 6). In the code it is a <C>Given</C>, and the functions that make it say only &quot;version&quot; (<C>versionFor</C>, <C>rollVersion</C>). It is not the <C>versions</C> a seed file records or <C>PROMPT_VERSION</C>: those say which writing rules a file was written to, and the composer never reads them.</>],
];
/** The data shapes of the composer, each by its type name: what it holds and where the page shows it. */
const SHAPES: [string, ReactNode][] = [
  ["ComposeInput", <>Everything <C>composeDay</C> takes to build one day: the player&apos;s questionnaire answers, the solid steps with the time each was last rated, the library as a list of <C>Candidate</C>, the date, the choices it may not pick (yesterday&apos;s and the ones turned down today), the exercises to keep, the seed for the random numbers, and the progress log. The Architecture view lists every field.</>],
  ["Candidate", <>One choice of a library block as the composer sees it: <C>blockId</C>, <C>choiceId</C>, the steps it names, its minutes, <C>use</C> (how often everyone has played the block), <C>mine</C> (this player&apos;s newest rating of the choice, or null) and <C>exercise</C>, the choice ready to sit in a plan.</>],
  ["PlanExercise", <>One exercise of a day. It is a block (a title, the cells with its text and tools, and <C>moves</C> when it has them) with what the plan knows about it: minutes, level, steps, and <C>given</C>, its exercise version. <C>id</C> is its slot in this plan; <C>blockId</C> and <C>choiceId</C> say which library choice it is. Its <C>choice</C> field is a different thing from a choice of a block: it is the row of chips, such as a Key selector, that the player picks from inside the exercise.</>],
  ["ProgressEntry", <>One rated exercise in the player&apos;s progress log: the stars, the steps the exercise named, its <C>blockId</C> and <C>choiceId</C>, and <C>given</C>, the exercise version it was played in. The solid steps, a choice&apos;s newest rating and its next exercise version are all read from these rows.</>],
  ["DaySteps", <>The steps one day works on, in three lists: <C>fresh</C> (within reach and not solid), <C>open</C>, and <C>review</C> (solid, rated longest ago first). Stage 2 shows them.</>],
  ["Moves", <>On a block: what may change from one play to the next. <C>key: &quot;any&quot;</C> means it can be played in any key. <C>bpm</C> is a range of tempos, <C>from</C> and <C>to</C>, with <C>step</C>, the size of one step up. A block without <C>moves</C> gets no rolled exercise version.</>],
  ["Given", <>An exercise version as data. <C>keys</C> and <C>bpm</C> each hold <C>now</C> (what the exercise opens in) and <C>back</C> (the earlier values, kept so the player can go back to them). <C>moved</C> counts the moves from the first-play version. A part that is absent stays as the block is written.</>],
  ["RollTrace", <>How one exercise version was rolled: <C>last</C> (the newest rated play and its version), <C>odds</C> (the chances that rating gave), <C>draws</C> (the numbers drawn), <C>movesIn</C> (the moves still possible, each with its weight), <C>moved</C> (the part that moved) and <C>outcome</C>: first, back, same or move. One row of the stage 6 table is one <C>RollTrace</C>.</>],
  ["TracedPick", <>One pick as the composer decided it: <C>stage</C> (the pass it came from), <C>asked</C> (the step the day asked for), <C>step</C> (the step the choice was found on), <C>reason</C>, <C>fitted</C> (every choice that could have been picked), <C>total</C> (the minutes filled after it), and its <C>given</C> and <C>roll</C>. Stage 4 draws these.</>],
  ["ComposeTrace", <>Everything <C>composeDay</C> decided, stage by stage: the minutes, the <C>DaySteps</C>, the library counts, the picks in order, and the steps that had no usable choice. It is made only for this page (<C>explainDay</C>) and never stored.</>],
  ["ComposedDay", <>What <C>composeDay</C> gives back: <C>exercises</C> (the kept ones first, then the new picks, review last), <C>steps</C> (the steps the new picks work on) and <C>short</C>, true when the day ends more than 5 minutes under its minutes because the library has no more for these steps.</>],
];

/** One stage of the algorithm: its number, its name, the rule in full, then what the rule gave for this player and day. */
function Stage({ n, title, rule, children }: { n: number; title: string; rule: ReactNode; children: ReactNode }) {
  return (
    <li className="relative pl-12">
      <span aria-hidden className="absolute left-0 top-0 grid size-8 place-items-center rounded-full border border-sky-400/60 bg-sky-500/15 text-sm font-semibold tabular-nums text-sky-100">{n}</span>
      <span aria-hidden className="absolute bottom-[-1.25rem] left-4 top-9 w-px bg-slate-700" />
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <div className="mb-3 mt-1 flex max-w-3xl flex-col gap-1.5 text-xs leading-relaxed text-slate-400">{rule}</div>
        {children}
      </section>
    </li>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="text-slate-500"><tr>{head.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-800">{r.map((c, j) => <td key={j} className="py-1.5 pr-3 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** A count as a bar against the largest of its group. */
function Bar({ label, n, of, tone }: { label: string; n: number; of: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-72 shrink-0 text-slate-300">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${of ? (n / of) * 100 : 0}%` }} /></span>
      <span className="w-10 text-right tabular-nums text-slate-200">{n}</span>
    </div>
  );
}

const STAR_NAME = ["", "1★", "2★", "3★", "4★ Solid", "5★ Solid"];
const stepButton = "rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * Stage 4 one pick at a time: the pass and the step it asked for, every choice that fitted with what `choose` ranks it
 * by, the one picked and why, and the day as it stood after the pick.
 */
function PickStepper({ trace }: { trace: ComposeTrace }) {
  const [at, setAt] = useState(0);
  const n = trace.picks.length;
  if (!n) return <p className="mb-3 text-xs text-slate-500">This day has no picks to step through.</p>;
  const i = Math.min(at, n - 1);
  const p = trace.picks[i];
  const before = i ? trace.picks[i - 1].total : 0;
  // the unrated choices the random draw is made from: the least used three, or the least used fifth when that is more
  const unrated = p.fitted.filter((f) => f.stars === null).sort((a, b) => a.use.seconds - b.use.seconds || a.use.times - b.use.times || a.choiceId.localeCompare(b.choiceId));
  const draw = new Set(p.reason === "unrated" ? unrated.slice(0, Math.max(3, Math.ceil(unrated.length / 5))).map((f) => f.choiceId) : []);
  return (
    <div className="mb-4 rounded-lg border border-sky-400/40 bg-sky-500/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-2 text-sm font-semibold text-slate-100">Step through the picks</h3>
        <button type="button" className={stepButton} disabled={i === 0} onClick={() => setAt(0)}>First</button>
        <button type="button" className={stepButton} disabled={i === 0} onClick={() => setAt(i - 1)}>Back</button>
        <span className="text-sm tabular-nums text-slate-200">Pick {i + 1} of {n}</span>
        <button type="button" className={stepButton} disabled={i === n - 1} onClick={() => setAt(i + 1)}>Next</button>
        <button type="button" className={stepButton} disabled={i === n - 1} onClick={() => setAt(n - 1)}>Last</button>
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">The same picks as the table below, one at a time. For each pick: what the composer was looking for, every choice it could have taken, the one it took, and the day after the pick.</p>

      <div className="mt-3 grid gap-4 desk:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3 text-xs text-slate-300">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">1. What the composer was looking for</p>
            <p className="leading-relaxed"><span className={`mr-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] ${STAGE_STYLE[p.stage]}`}>{STAGE_LABEL[p.stage]}</span>{STAGE_NOTE[p.stage]}</p>
            <p className="mt-1 leading-relaxed">It had {before} of {trace.minutes.budget} minutes filled, and asked for an exercise on the step <StepChip refId={p.asked} /> <span className="text-slate-100">{stepName(p.asked)}</span>.</p>
            {p.step !== p.asked && <p className="mt-1 leading-relaxed text-amber-300">No choice was left for that step, so it went down the track to the nearest earlier step that had one: <StepChip refId={p.step} tone="border-amber-500/50 text-amber-200" /> {stepName(p.step)}.</p>}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">2. The choices that fitted ({p.fitted.length})</p>
            <p className="mb-1 leading-relaxed text-slate-400">Every choice that names this step and no later step of its track, is not barred today, and is not from a block already in the day.{p.stage === "review" ? ` In this pass, only choices of at most ${Math.round(trace.minutes.reviewCap)} minutes.` : ""}</p>
            <Table
              head={["Choice", "Minutes", "The player's newest rating", "Used by all players", ""]}
              rows={p.fitted.map((f) => {
                const won = f.choiceId === p.choiceId;
                return [
                  <span key="t" className={won ? "font-semibold text-sky-100" : "text-slate-300"}>{f.title}<span className="block font-mono text-[10px] font-normal text-slate-500">{f.choiceId}</span></span>,
                  f.minutes,
                  f.stars === null ? <span key="r" className="text-slate-500">never rated</span> : <span key="r">{STAR_NAME[f.stars]}<span className="block text-[10px] text-slate-500">{f.ratedAt?.slice(0, 10)}</span></span>,
                  `${f.use.times} times`,
                  won ? <b key="w" className="whitespace-nowrap rounded border border-sky-400/70 bg-sky-500/20 px-1.5 py-0.5 text-[11px] text-sky-50">picked</b>
                    : draw.has(f.choiceId) ? <span key="w" className="whitespace-nowrap text-[11px] text-slate-500">in the draw</span> : "",
                ];
              })}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">3. Why this one</p>
            <p className="leading-relaxed">{REASON[p.reason]}{p.reason === "unrated" && draw.size > 1 ? ` The draw was among ${draw.size} choices: the one picked and the ones marked "in the draw".` : ""}{p.among === 1 ? " It was the only choice that fitted." : ""}</p>
          </div>
        </div>

        <div className="text-xs text-slate-300">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">4. The day after this pick</p>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (p.total / trace.minutes.budget) * 100)}%` }} /></span>
            <span className="tabular-nums text-slate-200">{p.total} of {trace.minutes.budget} min</span>
          </div>
          <ol className="flex flex-col gap-1">
            {trace.picks.slice(0, i + 1).map((x, j) => (
              <li key={x.choiceId}>
                <button type="button" onClick={() => setAt(j)} className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left hover:bg-slate-800 ${j === i ? "bg-sky-500/15 text-sky-50" : "text-slate-300"}`}>
                  <span className="w-4 shrink-0 tabular-nums text-slate-500">{j + 1}</span>
                  <span className={`shrink-0 whitespace-nowrap rounded border px-1 text-[10px] ${STAGE_STYLE[x.stage]}`}>{STAGE_LABEL[x.stage]}</span>
                  <span className="flex-1">{x.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{x.minutes} min</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 leading-relaxed text-slate-500">{p.total >= trace.minutes.budget ? "The minutes are full: the composer stops here." : i === n - 1 ? "The composer stops here: no pass could add another exercise." : `${trace.minutes.budget - p.total} minutes still to fill.`} This is the order of picking. In the stored day (stage 7) the review exercises go last.</p>
        </div>
      </div>
    </div>
  );
}

const field = "rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100";
function Control({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}{children}</label>;
}

export default function ComposeLab() {
  const [personaId, setPersonaId] = useState(PERSONAS[1].id);
  const [minutes, setMinutes] = useState<number | "own">("own");
  const [rung, setRung] = useState<KeyRung | "unset">("unset");
  const [rating, setRating] = useState<LabRating>("solid");
  const [date, setDate] = useState("2026-11-18");
  const [seed, setSeed] = useState("player-1");
  const [at, setAt] = useState(0);
  const [view, setView] = useState<"day" | "architecture">("day");

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
  const answers = useMemo(() => {
    const { keys: _own, ...rest } = persona.answers;
    void _own;
    return { ...rest, ...(minutes === "own" ? {} : { minutes }), ...(rung === "unset" ? {} : { keys: rung }) };
  }, [persona, minutes, rung]);
  const blocks = useMemo(() => seedCandidates(answers.areas), [answers.areas]);
  const days = useMemo(() => simulate({ answers, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "2026-11-18", days: 7, seed, rating }, blocks), [answers, date, seed, rating, blocks]);
  const d = days[Math.min(at, days.length - 1)];
  const { trace, day } = d;
  const areas = AREAS.filter((a) => d.answers.areas.includes(a.id));
  const picked = new Set(trace.picks.map((p) => p.step));
  const keyed = trace.picks.filter((p) => p.given?.keys && !p.roll);
  const rolled = trace.picks.filter((p) => p.roll);
  const withMoves = blocks.filter((b) => b.exercise.moves).length;
  const withSelector = blocks.filter((b) => hasKeySelector(b.exercise)).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Plan algorithm</h1>
        <div className="flex max-w-3xl flex-col gap-2 text-sm leading-relaxed text-slate-400">
          <p>This page shows how the app builds one day&apos;s practice plan, with every decision made on the way. The code that builds the plan is called the composer. The page has two views:</p>
          <ul className={LIST}>
            <li><T>One day</T> walks through the seven stages of building a plan for a made-up player, in the order the code runs them. Each stage first says the rule, then shows what the rule gave for the day picked.</li>
            <li><T>Architecture</T> shows the code around the composer: which pages and routes ask for a plan, what data they hand over, and which functions the composer calls.</li>
          </ul>
          <p>What is real here and what is not. The composer is the real code the app runs (<C>composeDay</C> in <C>plan/model/compose.ts</C>). The exercises are the seed block files in the code, not the database, so before day 1 nobody has used or rated any of them. The player is made up. The page builds seven days in a row and rates each day before it builds the next one, so from day 2 on a plan reacts to the ratings of the days before it.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {([["day", "One day"], ["architecture", "Architecture"]] as const).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${view === v ? "border-sky-500 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-200 hover:bg-slate-800"}`}>{label}</button>
        ))}
      </div>

      {view === "architecture" ? <Architecture /> : <>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <Control label="Player"><Select size="sm" value={personaId} onChange={setPersonaId} options={PERSONAS.map((p) => ({ value: p.id, label: p.label }))} aria-label="Player" /></Control>
        <Control label="Minutes a day"><Select size="sm" value={minutes} onChange={setMinutes} options={[{ value: "own" as number | "own", label: `Their own (${persona.answers.minutes})` }, ...MINUTES.map((m) => ({ value: m as number | "own", label: String(m) }))]} aria-label="Minutes a day" /></Control>
        <Control label="Keys question"><Select size="sm" value={rung} onChange={setRung} options={[{ value: "unset" as KeyRung | "unset", label: "Not sure (by level)" }, ...KEY_RUNGS.map((r) => ({ value: r as KeyRung | "unset", label: RUNG_NAMES[r] }))]} aria-label="Keys question" /></Control>
        <Control label="Rates every exercise"><Select size="sm" value={rating} onChange={setRating} options={[{ value: "solid" as LabRating, label: "Solid (4 stars)" }, { value: "hard" as LabRating, label: "Hard (2 stars)" }, { value: "none" as LabRating, label: "Doesn't rate" }]} aria-label="Rates every exercise" /></Control>
        <Control label="First day"><input className={field} value={date} onChange={(e) => setDate(e.target.value)} aria-label="First day" /></Control>
        <Control label="Seed (the player's id)"><input className={field} value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Seed" /></Control>
      </div>

      <ul className={`${LIST} max-w-4xl text-xs leading-relaxed text-slate-500`}>
        <li><T>Player</T>: one of the made-up players, with their own questionnaire answers. <T>Minutes a day</T> and <T>Keys question</T> replace two of those answers, so one answer can be changed with the rest left alone.</li>
        <li><T>Rates every exercise</T>: after each day is built, the made-up player gives every exercise of that day this one rating. Solid makes the steps solid, so later days move on to new steps. Hard keeps the same steps and brings the same exercises back. With no rating, nothing changes from day to day except the date.</li>
        <li><T>First day</T>: the date of day 1, as yyyy-mm-dd. The date decides which topic goes first in a day.</li>
        <li><T>Seed</T>: stands in for the player&apos;s id. Every random pick comes from it, so the same seed with the same settings always gives the same seven days, and another seed gives another player with the same answers.</li>
      </ul>

      <Words />

      <p className="text-xs text-slate-500">Pick a day. Each tab shows the date, how many exercises the day holds and how many minutes were filled.</p>
      <div role="tablist" aria-label="Day" className="flex flex-wrap gap-2">
        {days.map((x, i) => (
          <button key={x.date} type="button" role="tab" aria-selected={i === at} onClick={() => setAt(i)} className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left text-xs ${i === at ? "border-sky-400/70 bg-sky-500/20 text-sky-50" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            <span className="font-semibold">Day {i + 1}</span>
            <span className="tabular-nums opacity-70">{x.date} · {x.day.exercises.length} exercises · {x.trace.minutes.filled} min{x.day.short ? " · short" : ""}</span>
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-5">
        <Stage n={1} title="The player" rule={<>
          <p>The composer starts from the player&apos;s answers to the first questionnaire: the areas they practise, the minutes a day, and one line for each topic (Not yet, Beginner, Intermediate or Advanced).</p>
          <p>Before each day, the ratings so far can raise a topic&apos;s line (<C>raisedAnswers</C>). A topic goes up one level when every skill of the topic that has a step at that level is solid there. It never goes below the answer. A raised line is shown in green, with the line it was before.</p>
          <p>A topic&apos;s line decides two things in the next stage: the step each of the topic&apos;s tracks starts on, and how many new steps the topic offers at once (1 for Not yet, 2 for Beginner, no limit from Intermediate).</p>
          <p>The three key columns belong to stage 5. The rung says how far up the area&apos;s key ladder the player stands: the answer to the keys question, or, with no answer, a rung worked out from the level in the area.</p>
        </>}>
          <Table
            head={["Area", "Level in the area", "Each topic and its line today", "Rung on the key ladder", "Keys of that rung", "Keys of the rungs below"]}
            rows={areas.map((a) => {
              const r = keyRung(d.answers.keys, levelOf(d.answers, a.id));
              const k = keysAt(a.id, r);
              const topics = Object.entries(d.answers.topics).filter(([id]) => topicById(id)?.area === a.id);
              return [
                a.label,
                levelOf(d.answers, a.id),
                topics.length ? topics.map(([id, line]) => {
                  const was = answers.topics[id];
                  return <span key={id} className="mr-2 inline-block whitespace-nowrap">{topicById(id)?.label}: <b className="text-slate-100">{LINES[line]}</b>{was !== line && <span className="text-emerald-300"> (was {was === undefined ? "unanswered" : LINES[was]})</span>}</span>;
                }) : <span className="text-slate-500">none answered: every topic starts as new</span>,
                <span key="r">{r + 1} of 5 · {RUNG_NAMES[r]}{d.answers.keys === undefined && <span className="text-slate-500"> (from the level)</span>}</span>,
                <b key="n" className="text-slate-100">{keys(k.now)}</b>,
                keys(k.back) || "–",
              ];
            })}
          />
          <p className="mt-2 text-xs text-slate-500">{d.solid} steps were solid before this day, from the ratings of the days before it. The player asked for {d.answers.minutes} minutes a day.</p>
        </Stage>

        <Stage n={2} title="The steps of the day" rule={<>
          <p><C>daySteps</C> decides which steps of the path today&apos;s plan works on. It picks no exercises yet. It makes three lists, and stage 4 takes exercises for them:</p>
          <ul className={LIST}>
            <li><T>Fresh</T>: the new material. Every step that is within reach and not solid yet. The list takes one step from each topic before it takes a second step from any topic, so one topic cannot fill the day. The topic that goes first moves on by one each date, so the same topic does not open every day.</li>
            <li><T>Open</T>: steps that are ready but over their topic&apos;s limit (see Open in the words above). Ordered the same way as Fresh, and used only after the fresh steps.</li>
            <li><T>Review</T>: every step that is solid, the one rated longest ago first.</li>
          </ul>
          <p>Each chip is one step, written <C>track-id:number</C>. A coloured chip is a step the day took an exercise for. A grey chip is a step on the list that got none: the minutes were full before its turn, or no exercise was left for it.</p>
        </>}>
          <div className="flex flex-col gap-2 text-xs">
            {([["Fresh", trace.steps.fresh, STAGE_STYLE.fresh], ["Open", trace.steps.open, STAGE_STYLE.open], ["Review", trace.steps.review, STAGE_STYLE.review]] as const).map(([name, refs, tone]) => (
              <div key={name} className="flex gap-3">
                <span className="w-16 shrink-0 pt-0.5 font-medium text-slate-300">{name} <span className="text-slate-500">{refs.length}</span></span>
                <span className="flex flex-wrap gap-1">
                  {refs.length ? refs.slice(0, 60).map((r) => <StepChip key={r} refId={r} tone={picked.has(r) ? tone : "border-slate-800 text-slate-500"} />) : <span className="text-slate-500">none</span>}
                  {refs.length > 60 && <span className="text-slate-500">+{refs.length - 60} more</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Hover a chip for the track and the name of the step. The number after each list name is how many steps are on the list.</p>
        </Stage>

        <Stage n={3} title="The library" rule={<>
          <p>The composer writes no exercises. A day can only hold choices that are in the library, so this stage counts how many the day can pick from. It starts with every choice of every block in the player&apos;s areas, then takes two groups out:</p>
          <ol className={STEPS}>
            <li><T>Beyond reach</T>: a choice is out when any step it names is ahead, which means the step needs something the player does not know yet. Choices on known, within-reach and open steps stay.</li>
            <li><T>Barred today</T>: a choice that was in yesterday&apos;s plan is not picked again today (another choice of the same block may be). When a player asks for another plan on the same day, three more groups are barred: the choices they turned down, the exercises they already rated today (those are kept in the day as they are), and every other choice of a kept block. On this page nothing is kept or turned down, so only yesterday&apos;s choices are barred.</li>
          </ol>
          <p>Each bar is drawn against the first one. The last bar is what stage 4 picks from.</p>
        </>}>
          <div className="flex flex-col gap-1.5">
            <Bar label="1. All choices in the player's areas" n={trace.library.all} of={trace.library.all} tone="bg-slate-500" />
            <Bar label="2. Left without the ones beyond reach" n={trace.library.inReach} of={trace.library.all} tone="bg-sky-500" />
            <Bar label="3. Left without the ones barred today" n={trace.library.usable} of={trace.library.all} tone="bg-emerald-500" />
          </div>
        </Stage>

        <Stage n={4} title="Filling the minutes" rule={<>
          <p><C>fill</C> adds exercises to the day until the minutes are full. Today&apos;s budget is {trace.minutes.budget} minutes. It makes five passes, in this order, and stops as soon as the minutes filled reach the budget. An exercise is always added whole, so the last one can take the day a little over the budget.</p>
          <ol className="flex flex-col gap-1">
            <li><span className={`mr-1.5 whitespace-nowrap rounded border px-1 ${STAGE_STYLE.review}`}>{STAGE_LABEL.review}</span>Review that is sure of its place. {trace.minutes.reviewCount === 1 ? "1 exercise" : `${trace.minutes.reviewCount} exercises`} today (1 on a day under 30 minutes, 2 from 30 minutes), for the solid steps rated longest ago. Each can be at most {Math.round(trace.minutes.reviewCap)} minutes: a third of the day, and never under 5, so most of the day stays new. A review step with no exercise that short is passed over for the next one. These are picked first but placed last in the day.</li>
            <li><span className={`mr-1.5 whitespace-nowrap rounded border px-1 ${STAGE_STYLE.fresh}`}>{STAGE_LABEL.fresh}</span>One exercise for each step of the Fresh list of stage 2, in that order.</li>
            <li><span className={`mr-1.5 whitespace-nowrap rounded border px-1 ${STAGE_STYLE.open}`}>{STAGE_LABEL.open}</span>One exercise for each step of the Open list, in that order.</li>
            <li><span className={`mr-1.5 whitespace-nowrap rounded border px-1 ${STAGE_STYLE.more}`}>{STAGE_LABEL.more}</span>If minutes are left: one more exercise for each step that got one in passes 2 and 3, one step after the other, then round again. It ends when the minutes are full or a whole round adds nothing.</li>
            <li><span className={`mr-1.5 whitespace-nowrap rounded border px-1 ${STAGE_STYLE["more review"]}`}>{STAGE_LABEL["more review"]}</span>If minutes are still left: more exercises for the review steps, in rounds the same way, with no limit on their length. The review steps pass 1 did not get to come first.</li>
          </ol>
          <p><T>How an exercise is found for a step</T> (<C>pickFor</C>). A choice fits a step when it names that step and no later step of the same track. Choices barred today are skipped, and so is every choice of a block already in the day. When no choice is left for the step, the composer tries the step before it on the same track, then the one before that, down to the first. The table shows this in amber.</p>
          <p><T>Which choice, when several fit</T> (<C>choose</C>). This is the column Why this choice:</p>
          <ol className={STEPS}>
            <li>A choice the player rated under Solid (1 to 3 stars), the most recently rated first. It comes back until it is solid.</li>
            <li>If there is none: a choice the player never rated. It is drawn at random from the ones all players have used least (the three least used, or the least used fifth when that is more).</li>
            <li>If every fitting choice is rated Solid: the one rated longest ago.</li>
          </ol>
          <p>One row of the table is one exercise added, in the order the composer added them.</p>
        </>}>
          <PickStepper key={d.date} trace={trace} />
          <Table
            head={["#", "Pass", "Step the pass asked for", "Choice picked (title, block id, choice id)", "Why this choice", "Minutes", "Minutes filled so far"]}
            rows={trace.picks.map((p, i) => [
              i + 1,
              <span key="s" title={STAGE_NOTE[p.stage]} className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] ${STAGE_STYLE[p.stage]}`}>{STAGE_LABEL[p.stage]}</span>,
              <span key="a" className="flex flex-col gap-0.5">
                <span><StepChip refId={p.asked} /> <span className="text-slate-400">{stepName(p.asked)}</span></span>
                {p.step !== p.asked && <span className="text-amber-300">no choice left for that step, so one for an earlier step of the track: <StepChip refId={p.step} tone="border-amber-500/50 text-amber-200" /></span>}
              </span>,
              <span key="b" className="text-slate-100">{p.title}<span className="block font-mono text-[10px] text-slate-500">{p.blockId}</span><span className="block font-mono text-[10px] text-slate-500">{p.choiceId}</span></span>,
              <span key="w" className="block max-w-xs">{REASON[p.reason]} <span className="text-slate-500">({p.among === 1 ? "It was the only choice that fitted." : `${p.among} choices fitted.`})</span></span>,
              p.minutes,
              <span key="f" className="flex w-28 items-center gap-2">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (p.total / trace.minutes.budget) * 100)}%` }} /></span>
                <span className="tabular-nums">{p.total}</span>
              </span>,
            ])}
          />
          {trace.empty.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-amber-300">
              Steps a pass asked for that got nothing, because no choice was left for the step or for any earlier step of its track: {trace.empty.map((r) => <StepChip key={r} refId={r} tone="border-amber-500/50 text-amber-200" />)}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Minutes is the length of the exercise. Minutes filled so far is the running total after it, drawn against the budget of {trace.minutes.budget}.</p>
        </Stage>

        <Stage n={5} title="The keys" rule={<>
          <p>This stage and the next one run after every exercise is picked. They decide the key and the tempo an exercise opens in. They never change which exercises are in the day.</p>
          <p>This stage is for blocks of the older shape: a block with its own Key selector (a row of key chips on the exercise) and no <C>moves</C>. A block with <C>moves</C> gets its keys in stage 6. A block with neither stays in the key it was written in.</p>
          <p>Each area has a key ladder: five rungs of keys, the easiest keys first. The boxes below show the ladders, with the player&apos;s rung in blue, the rungs under it in light grey and the rungs above it in dark grey. An exercise with a Key selector is given two sets of keys:</p>
          <ul className={LIST}>
            <li><T>Starts in</T>: the keys of the player&apos;s rung, at most three. When the rung has more than three, each exercise and each day gets a different three, so over the days every key of the rung comes round.</li>
            <li><T>Earlier</T>: up to three keys of the rungs below, the nearest rung first. The selector shows them last, under Earlier, for going back to an easier key.</li>
          </ul>
          <p>The block in the library is not changed. The keys are stored with the exercise in the player&apos;s plan, and the selector is filled with them when the exercise is drawn.</p>
        </>}>
          <div className="mb-3 grid gap-2 desk:grid-cols-3">
            {areas.map((a) => {
              const r = keyRung(d.answers.keys, levelOf(d.answers, a.id));
              return (
                <div key={a.id} className="rounded-lg border border-slate-800 p-2">
                  <p className="mb-1 text-xs font-medium text-slate-200">{a.label} ladder</p>
                  <ol className="flex flex-wrap items-center gap-1 text-[11px]">
                    {KEY_LADDERS[a.id].map((rungKeys, i) => (
                      <li key={i} className={`rounded border px-1.5 py-0.5 ${i === r ? "border-sky-400/70 bg-sky-500/20 font-semibold text-sky-50" : i < r ? "border-slate-600 text-slate-300" : "border-slate-800 text-slate-600"}`}>{keys(rungKeys)}</li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
          {keyed.length ? (
            <Table
              head={["Exercise", "Area", "Keys the block is written with", "Keys given: starts in", "Keys given: under Earlier"]}
              rows={keyed.map((p) => {
                const e = day.exercises.find((x) => x.choiceId === p.choiceId);
                const written = e?.choice && "options" in e.choice ? e.choice.options.flatMap((o) => (o.key === undefined ? [] : [o.key])) : [];
                return [<span key="t" className="text-slate-100">{p.title}</span>, e?.area ?? "", keys(written), <b key="n" className="text-sky-100">{keys(p.given!.keys!.now)}</b>, keys(p.given!.keys!.back) || "–"];
              })}
            />
          ) : <p className="text-xs text-slate-500">No exercise of this day has a Key selector.</p>}
          <p className="mt-2 text-xs text-slate-500">{keyed.length} of the {trace.picks.length} exercises picked today have a Key selector and no moves. In the whole library of these areas, {withSelector} of the {blocks.length} choices have a Key selector.</p>
        </Stage>

        <Stage n={6} title="The exercise versions" rule={<>
          <p>This stage is for a block with <C>moves</C>. A block&apos;s <C>moves</C> say which parts of the exercise may change from one play to the next: its key, its tempo (a range in bpm and the size of one step up), or both. An exercise version is the key or keys and the tempo this player gets today. Like stage 5, this changes no pick. The code is in <C>plan/model/roll.ts</C>.</p>
          <p><T>The first play of a choice</T> opens in the first key of its track and at the block&apos;s starting tempo. If the player has already earned more keys on that track, there is a {pct(ROLL.earnedOnFirst)} chance it opens with those keys too.</p>
          <p><T>Every later play</T> is decided by the player&apos;s newest rating of this choice. The rating sets the chances and a random number picks the outcome, so a rating makes an outcome likely but never certain:</p>
          <ul className={LIST}>
            <li>1 or 2 stars (found hard): {pct(ROLL.low.back)} back to the easier version played before, otherwise the same version again.</li>
            <li>3 stars: {pct(ROLL.mid.move)} one move, otherwise the same version again.</li>
            <li>4 or 5 stars (found easy): {pct(ROLL.high.move)} one move, otherwise the same version again.</li>
          </ul>
          <p><T>A move</T> makes the exercise a little harder in one part only: the tempo goes up one step, or one more key is added. Which part is drawn by weight (tempo {ROLL.weights.bpm}, key {ROLL.weights.key}) among the moves still possible: the tempo is left out at the top of its range, the key when no further key is open to the player. The values from before stay on the exercise as chips, to go back to.</p>
          <p><T>The random numbers</T> are seeded by the player, the choice and that newest rating. So a choice keeps its exercise version on every day and on every new plan until the player rates it again. Only a new rating makes a new roll.</p>
          <p><T>Reading the table</T>. Numbers drawn: the first number is compared with the odds (under the back or the move chance means that outcome), the second, when there is one, picks which part moves. The last five columns are not part of today&apos;s plan: they show the roll the composer would make next if the player rated today&apos;s version with 1, 2, 3, 4 or 5 stars.</p>
        </>}>
          {rolled.length ? (
            <Table
              head={["Choice (title, block id, choice id)", "Last play: exercise version and rating", "Chances from that rating: back / same / move", "Numbers drawn (0 to 1)", "Moves still possible: part, weight (new value)", "Outcome", "Exercise version given today", "Next, if rated 1★", "Next, if rated 2★", "Next, if rated 3★", "Next, if rated 4★", "Next, if rated 5★"]}
              rows={rolled.map((p) => {
                const r = p.roll!;
                const e = day.exercises.find((x) => x.choiceId === p.choiceId);
                const next = (stars: 1 | 2 | 3 | 4 | 5) => { const v = e ? nextVersion(e, d, seed, stars) : null; return v ? <span key={stars}>{version(v.given)}<span className="block text-[10px] text-slate-500">{v.roll ? OUTCOME[v.roll.outcome] : ""}{v.roll?.moved ? `: ${PART_NAME[v.roll.moved]}` : ""}</span></span> : "–"; };
                return [
                  <span key="t" className="text-slate-100">{p.title}<span className="block font-mono text-[10px] text-slate-500">{p.blockId}</span><span className="block font-mono text-[10px] text-slate-500">{p.choiceId}</span></span>,
                  r.last ? <span key="l">{version(r.last.given)} <span className="text-amber-200">{r.last.stars}★</span></span> : "none: this is the first play",
                  r.last ? `${pct(r.odds.back)} / ${pct(r.odds.same)} / ${pct(r.odds.move)}` : "–",
                  r.draws.length ? r.draws.map((x) => x.toFixed(2)).join(", ") : "–",
                  r.movesIn.length ? r.movesIn.map((m) => `${PART_NAME[m.part]} ${m.weight} (to ${m.part === "key" ? keyName(m.to) : m.to})`).join(" · ") : "–",
                  <b key="o" className="text-sky-100">{OUTCOME[r.outcome]}{r.moved ? `: ${PART_NAME[r.moved]}` : ""}</b>,
                  p.given ? version(p.given) : "–",
                  next(1), next(2), next(3), next(4), next(5),
                ];
              })}
            />
          ) : <p className="text-xs text-slate-500">No exercise of this day has moves.</p>}
          <p className="mt-2 text-xs text-slate-500">{rolled.length} of the {trace.picks.length} exercises picked today have moves. In the whole library of these areas, {withMoves} of the {blocks.length} choices have moves. An exercise version reads: the keys it opens in, then the earlier keys, then the tempo, then the earlier tempos. A dash means there was nothing to show: no earlier play, no number drawn, or no move possible.</p>
        </Stage>

        <Stage n={7} title="The day" rule={<>
          <p>The result: the day as it is stored in the player&apos;s plan. The exercises are in the order stage 4 picked them, except that all review exercises go last, so a day starts with new material and ends with review.</p>
          <p>Each row is one exercise: its title, its minutes, the steps its choice names, and in blue the exercise version stages 5 and 6 gave it, when it got one.</p>
          <p>A day is marked short when it ends more than 5 minutes under its budget. That means the library had no more choices left for these steps, not that something failed.</p>
        </>}>
          <ol className="flex flex-col gap-1 text-xs text-slate-300">
            {day.exercises.map((e, i) => (
              <li key={e.choiceId ?? i} className="flex flex-wrap items-baseline gap-2">
                <span className="w-5 tabular-nums text-slate-500">{i + 1}</span>
                <span className="text-slate-100">{shownTitle(e)}</span>
                <span className="text-slate-500">{e.minutes} min</span>
                {(e.steps ?? []).map((r) => <StepChip key={r} refId={r} />)}
                {e.given && <span className="text-sky-200">{version(e.given)}</span>}
              </li>
            ))}
          </ol>
          <p className={`mt-2 text-xs ${day.short ? "text-amber-300" : "text-slate-500"}`}>{trace.minutes.filled} minutes filled of a budget of {trace.minutes.budget}{day.short ? ". The day is short: the library has no more choices for these steps." : "."}</p>
        </Stage>
      </ol>
      </>}
    </div>
  );
}
