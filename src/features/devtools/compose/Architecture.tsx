import type { ReactNode } from "react";

/*
 * /dev/compose → "Architecture": how the plan algorithm is put together. Who asks for a plan, what the server reads
 * for it, what the pure composer calls inside, what comes back and who stores it. Written by hand from the code it
 * names: keep it true when one of those files changes (the files are listed at the bottom of the view).
 */

type Layer = "browser" | "server" | "pure" | "data";
const LAYER: Record<Layer, { label: string; box: string; dot: string }> = {
  browser: { label: "Browser", box: "border-violet-400/50 bg-violet-500/10", dot: "bg-violet-400" },
  server: { label: "Server", box: "border-amber-400/50 bg-amber-500/10", dot: "bg-amber-400" },
  pure: { label: "Pure model (no React, no I/O)", box: "border-sky-400/60 bg-sky-500/10", dot: "bg-sky-400" },
  data: { label: "Stored data", box: "border-emerald-500/50 bg-emerald-500/10", dot: "bg-emerald-400" },
};

/** One part of the system: its name in code, the file it lives in, and what it does in a line. */
function Node({ layer, name, file, children }: { layer: Layer; name: string; file?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${LAYER[layer].box}`}>
      <p className="font-mono text-xs font-semibold text-slate-100">{name}</p>
      {file && <p className="font-mono text-[10px] text-slate-500">{file}</p>}
      {children && <p className="mt-1 text-xs leading-relaxed text-slate-300">{children}</p>}
    </div>
  );
}

/** The arrow between two parts, with what is handed over. */
function Arrow({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-4 text-[11px] text-slate-400">
      <span aria-hidden className="text-base leading-none text-slate-500">↓</span>
      {children && <span>{children}</span>}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <p className="mb-3 mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-400">{note}</p>
      {children}
    </section>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

/** A name from the code, an API call or a status: one font for all of them, here and in the One day view. */
export const C = ({ children }: { children: ReactNode }) => <code className="font-mono text-[11px] text-slate-200">{children}</code>;

/** What `composeDay` takes: the field, where the server gets it, what the composer does with it. */
const INPUTS: [string, ReactNode, ReactNode][] = [
  ["answers", <>The plan document&apos;s <C>answers</C>, through <C>raisedAnswers</C>: each topic raised level by level as far as the ratings reach (a teacher&apos;s score replaces the answer as the floor).</>, <>Areas, minutes a day, the keys question, and each topic&apos;s line: where its tracks start and how many steps it offers at once.</>],
  ["solid", <>Every progress entry, through <C>solidRatedAt</C>: the steps whose newest rating is Solid or better, with when.</>, <>Solid steps are known (so the next ones come within reach) and are the review list, rated longest ago first.</>],
  ["blocks", <><C>library.composeBlocks(player, areas)</C>, each through <C>candidateOf</C>: the app&apos;s reusable blocks of the areas that name a step and hold a slot, with everyone&apos;s use and this player&apos;s newest rating.</>, <>The only exercises a day can hold. The composer writes none and changes none.</>],
  ["date", <>Sent by the page (its local date), refused unless within one day of the server&apos;s.</>, <>Rotates which topic opens the day; part of the seed.</>],
  ["yesterday", <>The block ids of the newest own composed day before <C>date</C>. A shared plan is never read.</>, <>Never picked today.</>],
  ["keep", <>With <C>another</C>: today&apos;s exercises that are already rated.</>, <>Stay as they are, first in the day; their minutes come off the budget.</>],
  ["declined", <>With <C>another</C>: every block turned down earlier today, and today&apos;s unrated ones.</>, <>Never picked again today.</>],
  ["seed", <><C>{"`${player}:${date}:${attempt}`"}</C>; the attempt goes up with each <C>another</C>.</>, <>The only randomness (which unrated block, which three keys). The same input gives the same day.</>],
];

/** The calls inside `composeDay`, in order, with the stage of the "One day" view that shows each. */
const INSIDE: { n: string; name: string; file: string; text: ReactNode; calls?: { name: string; file: string; text: ReactNode }[] }[] = [
  {
    n: "2", name: "daySteps", file: "plan/model/daySteps.ts",
    text: <>Which steps of the path the day works on: <C>fresh</C> (within reach, not solid, one per topic before any topic&apos;s second), <C>open</C> (ready, but over the topic&apos;s share) and <C>review</C> (solid, rated longest ago first).</>,
    calls: [
      { name: "reach", file: "plan/model/reach.ts", text: <>Marks every step known, within reach or ahead. Known comes from the questionnaire and from solid ratings, and carries back through what a step needs first.</> },
      { name: "placement", file: "plan/intake/placement.ts", text: <>Where a topic&apos;s line starts each of its tracks.</> },
      { name: "PATH", file: "plan/model/path.ts", text: <>The tracks, their steps and what each step needs first. Data, not logic: the composer never names a step.</> },
    ],
  },
  {
    n: "3", name: "withinReach", file: "plan/model/compose.ts",
    text: <>Drops every block that names a step beyond reach. <C>used</C> starts as yesterday&apos;s, the declined and the kept blocks.</>,
    calls: [{ name: "reach", file: "plan/model/reach.ts", text: <>The same marks as for the day&apos;s steps.</> }],
  },
  {
    n: "4", name: "fill", file: "plan/model/compose.ts",
    text: <>Fills the budget in five stages: planned review (1 block, 2 from 30 minutes, each within a third of the day), one block per fresh step, one per open step, rounds over the day&apos;s steps, more review. It stops when the minutes are full or a pass adds nothing.</>,
    calls: [
      { name: "pickFor", file: "plan/model/compose.ts", text: <>A block for one step; with none usable, the nearest earlier step of the same track.</> },
      { name: "fits", file: "plan/model/compose.ts", text: <>A block fits a step when it names it and no later step of that track.</> },
      { name: "choose", file: "plan/model/compose.ts", text: <>Among a step&apos;s blocks: rated under Solid (newest) first, else unrated (random among the least used), else solid (rated longest ago).</> },
    ],
  },
  {
    n: "5", name: "keysFor", file: "plan/model/compose.ts",
    text: <>After every pick is made, and changing none: an exercise with a Key selector gets the keys of the player&apos;s rung.</>,
    calls: [
      { name: "keyRung", file: "plan/model/keys.ts", text: <>The rung in the exercise&apos;s area: the keys answer, else from the area&apos;s level.</> },
      { name: "exerciseKeys", file: "plan/model/keys.ts", text: <>At most three keys of the rung (a different three by the seed where the rung has more) and the three nearest earlier ones.</> },
    ],
  },
];

const HOLDS: ReactNode[] = [
  <>The composer is pure. <C>composeDay</C> reads no clock, no database and no network; everything arrives in its input, so tests and this page run the real one.</>,
  <>A player&apos;s day is never written by the server. The route answers with the day and the page stores it (<C>startDay</C>, <C>anotherDay</C>), both safe to call twice. A teacher&apos;s week is the one the server writes.</>,
  <>Nothing blocks a player. A step ahead is only ranked later; a step with no block falls back down its track.</>,
  <>A block is stored as written. Minutes, why and links are the slot&apos;s; the keys ride on the exercise in the plan.</>,
  <>A block never comes two days running, and never twice in a day.</>,
  <>A day more than 5 minutes under its budget is <C>short</C>: the library has no more for these steps. Left over time of 5 minutes or less after the kept exercises asks for a whole new day&apos;s minutes.</>,
  <>A teacher&apos;s student is never composed for here: the route answers <C>409 taught</C> before reading anything.</>,
];

const FILES: [string, ReactNode][] = [
  ["plan/ui/useTodayPlan.ts", <>When the page asks: once per page view and date, after the store is flushed.</>],
  ["plan/model/today.ts", <>What the page shows and what an answer does to the stored plan (<C>applyFirst</C>, <C>applyAnother</C>). Pure.</>],
  ["plan/store/composeClient.ts", <><C>requestDay</C>: the <C>POST</C>, a 15 s timeout, every failure as a code.</>],
  ["app/api/me/plan/compose/route.ts", <>The route file: builds the real repos and calls <C>composeRoute</C>.</>],
  ["plan/server/composeRoute.ts", <>Signed in, not a teacher&apos;s student, body checked; codes to <C>409</C>s.</>],
  ["plan/server/composeToday.ts", <>Reads the plan document, the ratings and the library, and builds the composer&apos;s input.</>],
  ["students/client.ts", <><C>postStudentPlan</C>: the teacher&apos;s <C>POST</C>.</>],
  ["app/api/students/[id]/plan/route.ts", <>The route file: calls <C>planRoute</C> (<C>students/server/http.ts</C>).</>],
  ["students/server/plans.ts", <><C>makeWeek</C>: the teacher&apos;s scores, the week&apos;s start, the write into the student&apos;s document.</>],
  ["plan/server/composeStudentWeek.ts", <>The same inputs for a teacher&apos;s student, seven days through <C>composeWeek</C>.</>],
  ["plan/model/topicLevels.ts", <><C>raisedAnswers</C>: the topic levels the day is paced by.</>],
  ["plan/model/compose.ts", <><C>composeDay</C>, <C>explainDay</C> (the same day with its trace), <C>composeWeek</C>.</>],
  ["plan/model/daySteps.ts", <><C>daySteps</C> and <C>solidRatedAt</C>.</>],
  ["plan/model/reach.ts", <><C>reach</C>: known, within reach, ahead.</>],
  ["plan/model/path.ts", <><C>PATH</C>: tracks, steps, what comes first.</>],
  ["plan/model/keys.ts", <>The key ladders and a player&apos;s keys.</>],
  ["plan/model/schedule.ts", <><C>startDay</C>, <C>anotherDay</C>, <C>giveWeek</C>: a composed day into the stored plan.</>],
  ["library/server/repo.ts", <><C>composeBlocks</C>: the blocks a day can be made from.</>],
  ["devtools/model/composeLab.ts", <>This page&apos;s stand-ins: <C>seedCandidates</C>, <C>simulate</C>.</>],
];

export default function Architecture() {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        {(Object.keys(LAYER) as Layer[]).map((l) => <li key={l} className="flex items-center gap-1.5"><span aria-hidden className={`size-2.5 rounded-full ${LAYER[l].dot}`} />{LAYER[l].label}</li>)}
      </ul>

      <Panel title="Who asks for a plan" note={<>Three callers, one composer. Each gathers the same eight inputs its own way and hands them to <C>composeDay</C>, which knows nothing about who asked.</>}>
        <div className="grid gap-4 desk:grid-cols-3">
          <Column title="A player's day">
            <Node layer="browser" name="useTodayPlan" file="plan/ui/useTodayPlan.ts">The Practice plan page has answers and no plan for today, or the player asks for another plan.</Node>
            <Arrow>flushes the store, then</Arrow>
            <Node layer="browser" name="requestDay" file="plan/store/composeClient.ts"><C>{"POST /api/me/plan/compose { date, another }"}</C></Node>
            <Arrow />
            <Node layer="server" name="composeRoute" file="plan/server/composeRoute.ts">Signed in; a teacher&apos;s student is refused (<C>409 taught</C>).</Node>
            <Arrow><C>player, {"{ date, another }"}</C></Arrow>
            <Node layer="server" name="composeToday" file="plan/server/composeToday.ts">Reads the stored data and builds the input (below).</Node>
          </Column>
          <Column title="A teacher's week">
            <Node layer="browser" name="StudentPage" file="students/ui/StudentPage.tsx">The teacher makes a student&apos;s next week, or a new one in place of this week&apos;s.</Node>
            <Arrow />
            <Node layer="browser" name="postStudentPlan" file="students/client.ts"><C>{"POST /api/students/<id>/plan { today, rotate, scores, comment }"}</C></Node>
            <Arrow />
            <Node layer="server" name="planRoute" file="students/server/http.ts">Signed in as the student&apos;s teacher; <C>today</C> within one day of the server&apos;s.</Node>
            <Arrow><C>teacher, studentId, {"{ today, rotate, scores, comment }"}</C></Arrow>
            <Node layer="server" name="makeWeek" file="students/server/plans.ts">Records the sliders the teacher moved, then works out the week&apos;s first day and the day before it.</Node>
            <Arrow><C>studentId, {"{ start, seed, today, yesterday }"}</C></Arrow>
            <Node layer="server" name="composeStudentWeek" file="plan/server/composeStudentWeek.ts">The same reads as <C>composeToday</C>, for the student.</Node>
            <Arrow />
            <Node layer="pure" name="composeWeek" file="plan/model/compose.ts">Seven days, each with the day before as its yesterday. No ratings arrive in between.</Node>
          </Column>
          <Column title="This page">
            <Node layer="browser" name="ComposeLab" file="devtools/compose/ComposeLab.tsx">A made-up player, no server, no database.</Node>
            <Arrow />
            <Node layer="pure" name="seedCandidates" file="devtools/model/composeLab.ts">The seed block files as the library: never used, never rated.</Node>
            <Arrow />
            <Node layer="pure" name="simulate" file="devtools/model/composeLab.ts">Seven days in a row, every exercise rated by one rule, each day seeing the days before.</Node>
          </Column>
        </div>
        <Arrow><C>ComposeInput</C></Arrow>
        <Node layer="pure" name="composeDay(input): ComposedDay" file="plan/model/compose.ts">One day from its input. <C>explainDay</C> is the same call that also returns every decision (<C>ComposeTrace</C>); the One day view draws that trace.</Node>
        <Arrow><C>{"ComposedDay { exercises, steps, short }"}</C></Arrow>
        <div className="grid gap-4 desk:grid-cols-3">
          <Node layer="data" name="startDay / anotherDay" file="plan/model/schedule.ts">The page stores the day as the player&apos;s current plan, through <C>PlanStore</C>. A rated exercise is never lost to another try.</Node>
          <Node layer="data" name="giveWeek" file="plan/model/schedule.ts"><C>makeWeek</C> writes the week into the student&apos;s plan document, with a version check, and the route answers <C>{"{ planId, start, short, comment }"}</C>.</Node>
          <Node layer="browser" name="One day view">Drawn, never stored.</Node>
        </div>
      </Panel>

      <Panel title="What goes in" note={<>The eight fields of <C>ComposeInput</C>, as <C>composeToday</C> builds them. It reads three things: the player&apos;s plan document, their progress entries and the library.</>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-slate-500"><tr>{["Field", "Where the server gets it", "What the composer does with it"].map((h) => <th key={h} className="py-1 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {INPUTS.map(([field, from, use]) => (
                <tr key={field} className="border-t border-slate-800">
                  <td className="py-1.5 pr-4 align-top font-mono text-[11px] font-semibold text-sky-100">{field}</td>
                  <td className="py-1.5 pr-4 align-top leading-relaxed">{from}</td>
                  <td className="py-1.5 pr-4 align-top leading-relaxed">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Inside composeDay" note={<>Four calls in order, each with what it calls in turn. The number is the stage of the One day view that shows the call&apos;s result for a real day (stage 1 is the input, stage 6 the day that comes out).</>}>
        <ol className="flex flex-col">
          {INSIDE.map((s, i) => (
            <li key={s.name}>
              {i > 0 && <Arrow />}
              <div className="grid gap-2 desk:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="flex gap-3">
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-sky-400/60 bg-sky-500/15 text-xs font-semibold tabular-nums text-sky-100">{s.n}</span>
                  <div className="flex-1"><Node layer="pure" name={s.name} file={s.file}>{s.text}</Node></div>
                </div>
                <ul className="flex flex-col gap-1.5 border-l border-slate-700 pl-3">
                  {s.calls?.map((c) => (
                    <li key={c.name} className="text-xs leading-relaxed text-slate-300">
                      <span className="font-mono text-[11px] font-semibold text-slate-100">{c.name}</span> <span className="font-mono text-[10px] text-slate-500">{c.file}</span>
                      <span className="block text-slate-400">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="What holds" note="The rules the parts are built round. A change that breaks one of these is a change of design, not a fix.">
        <ul className="flex max-w-4xl list-disc flex-col gap-1.5 pl-5 text-xs leading-relaxed text-slate-300">
          {HOLDS.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </Panel>

      <Panel title="Files" note={<>Under <C>src/features</C>, except the two route files. The design: <C>docs/superpowers/specs/2026-11-18-plan-composer-design.md</C>.</>}>
        <dl className="grid gap-x-6 gap-y-1.5 text-xs desk:grid-cols-[max-content_1fr]">
          {FILES.map(([file, what]) => (
            <div key={file} className="contents">
              <dt className="font-mono text-[11px] text-slate-200">{file}</dt>
              <dd className="text-slate-400">{what}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
