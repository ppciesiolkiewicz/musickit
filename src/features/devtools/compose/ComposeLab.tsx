"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Select } from "@/components/ui";
import { MINUTES, levelOf } from "@/features/plan/intake/answers";
import { topicById } from "@/features/plan/intake/topics";
import { AREAS } from "@/features/plan/model/concepts";
import type { PickReason, PickStage } from "@/features/plan/model/compose";
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
const STAGE_NOTE: Record<PickStage, string> = {
  review: "1. planned review: a solid step, rated longest ago, in a block short enough (placed last in the day)",
  fresh: "2. one block for each fresh step",
  open: "3. one block for each open step",
  more: "4. round after round over the day's steps, until the minutes are full",
  "more review": "5. more review, when the day's steps have no block left",
};
const REASON: Record<PickReason, string> = {
  low: "rated under Solid: the newest such block comes back",
  unrated: "not rated yet: a random one of the least used",
  solid: "every block is solid: the one rated longest ago",
};
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

/** One stage of the algorithm: its number, its name, the rule in a sentence, then what the rule gave for this player and day. */
function Stage({ n, title, rule, children }: { n: number; title: string; rule: ReactNode; children: ReactNode }) {
  return (
    <li className="relative pl-12">
      <span aria-hidden className="absolute left-0 top-0 grid size-8 place-items-center rounded-full border border-sky-400/60 bg-sky-500/15 text-sm font-semibold tabular-nums text-sky-100">{n}</span>
      <span aria-hidden className="absolute bottom-[-1.25rem] left-4 top-9 w-px bg-slate-700" />
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <p className="mb-3 mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-400">{rule}</p>
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
      <span className="w-56 shrink-0 text-slate-300">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${of ? (n / of) * 100 : 0}%` }} /></span>
      <span className="w-10 text-right tabular-nums text-slate-200">{n}</span>
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
        <p className="max-w-3xl text-sm text-slate-400">
          How one day&apos;s practice plan is built. One day: stage by stage, for a made-up player. Architecture: who asks for a plan, what goes in, what the composer calls inside. The composer is the real one (<C>plan/model/compose.ts</C>); the library is the seed blocks in the code, not the database, and the player is made up. Seven days are made in a row, so a day sees the days before it.
        </p>
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

      <div role="tablist" aria-label="Day" className="flex flex-wrap gap-2">
        {days.map((x, i) => (
          <button key={x.date} type="button" role="tab" aria-selected={i === at} onClick={() => setAt(i)} className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left text-xs ${i === at ? "border-sky-400/70 bg-sky-500/20 text-sky-50" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            <span className="font-semibold">Day {i + 1}</span>
            <span className="tabular-nums opacity-70">{x.date} · {x.day.exercises.length} blocks · {x.trace.minutes.filled} min{x.day.short ? " · short" : ""}</span>
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-5">
        <Stage n={1} title="The player" rule={<>The answers of the first questionnaire, with each topic raised to the level the ratings reach (<C>raisedAnswers</C>). A topic&apos;s line sets where its tracks start and how many steps it offers at once.</>}>
          <Table
            head={["Area", "Level", "Topics (line picked, raised by ratings)", "Key rung", "Keys now", "Earlier keys"]}
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
          <p className="mt-2 text-xs text-slate-500">{d.solid} steps solid before this day · {d.answers.minutes} minutes a day</p>
        </Stage>

        <Stage n={2} title="The steps of the day" rule={<><C>daySteps</C>: fresh steps are within reach and not solid, one per topic before any topic&apos;s second, and the topic that opens the day rotates with the date. Open steps are ahead only because their topic already offers its share. Review is every solid step, rated longest ago first. A filled chip is a step the day picked a block for.</>}>
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
          <p className="mt-2 text-xs text-slate-500">Hover a step for its name.</p>
        </Stage>

        <Stage n={3} title="The library" rule="Every block of the player's areas. A block is out when one of its steps is beyond reach, or when it was in yesterday's plan (or kept or turned down today).">
          <div className="flex flex-col gap-1.5">
            <Bar label="Blocks of these areas" n={trace.library.all} of={trace.library.all} tone="bg-slate-500" />
            <Bar label="Every step within reach" n={trace.library.inReach} of={trace.library.all} tone="bg-sky-500" />
            <Bar label="Not in yesterday's plan" n={trace.library.usable} of={trace.library.all} tone="bg-emerald-500" />
          </div>
        </Stage>

        <Stage n={4} title="Filling the minutes" rule={`Budget ${trace.minutes.budget} minutes. Planned review first (${trace.minutes.reviewCount} block${trace.minutes.reviewCount > 1 ? "s" : ""}, each at most ${Math.round(trace.minutes.reviewCap)} minutes), then one block per fresh step, per open step, then rounds over the day's steps, then more review. A step with no usable block takes the nearest earlier step of its track. Among a step's blocks: one rated under Solid first, else an unrated one, else the solid one rated longest ago.`}>
          <Table
            head={["#", "Stage", "Step asked", "Block", "Why this block", "Min", "Filled"]}
            rows={trace.picks.map((p, i) => [
              i + 1,
              <span key="s" title={STAGE_NOTE[p.stage]} className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] ${STAGE_STYLE[p.stage]}`}>{p.stage}</span>,
              <span key="a" className="flex flex-col gap-0.5">
                <span><StepChip refId={p.asked} /> <span className="text-slate-400">{stepName(p.asked)}</span></span>
                {p.step !== p.asked && <span className="text-amber-300">no block there: took <StepChip refId={p.step} tone="border-amber-500/50 text-amber-200" /></span>}
              </span>,
              <span key="b" className="text-slate-100">{p.title}<span className="block font-mono text-[10px] text-slate-500">{p.blockId}</span></span>,
              <span key="w">{REASON[p.reason]} <span className="text-slate-500">(of {p.among})</span></span>,
              p.minutes,
              <span key="f" className="flex w-28 items-center gap-2">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (p.total / trace.minutes.budget) * 100)}%` }} /></span>
                <span className="tabular-nums">{p.total}</span>
              </span>,
            ])}
          />
          {trace.empty.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-amber-300">
              No usable block, on the step or earlier in its track: {trace.empty.map((r) => <StepChip key={r} refId={r} tone="border-amber-500/50 text-amber-200" />)}
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            {(Object.keys(STAGE_NOTE) as PickStage[]).map((s) => <li key={s}><span className={`mr-1 rounded border px-1 ${STAGE_STYLE[s]}`}>{s}</span>{STAGE_NOTE[s].replace(/^\d\. /, "")}</li>)}
          </ul>
        </Stage>

        <Stage n={5} title="The keys" rule="Last, and it changes no pick. For a block of the older shape, with its own Key selector and no moves: it gets the keys of the player's rung in its area (at most three; a rung with more takes a different three per exercise and day) and the three nearest earlier keys, which the selector shows last, under Earlier. The keys ride on the exercise's slot; the block is stored as written. An exercise with no Key selector stays in its own key.">
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
              head={["Block", "Area", "Written with", "Starts in", "Earlier"]}
              rows={keyed.map((p) => {
                const e = day.exercises.find((x) => x.blockId === p.blockId);
                const written = e?.choice && "options" in e.choice ? e.choice.options.flatMap((o) => (o.key === undefined ? [] : [o.key])) : [];
                return [<span key="t" className="text-slate-100">{p.title}</span>, e?.area ?? "", keys(written), <b key="n" className="text-sky-100">{keys(p.given!.keys!.now)}</b>, keys(p.given!.keys!.back) || "–"];
              })}
            />
          ) : <p className="text-xs text-slate-500">No exercise of this day has a Key selector.</p>}
          <p className="mt-2 text-xs text-slate-500">{keyed.length} of this day&apos;s {trace.picks.length} picks have a Key selector; {withSelector} of the {blocks.length} blocks in these areas do.</p>
        </Stage>

        <Stage n={6} title="The versions" rule={<>Also last, and it changes no pick: a block with <C>moves</C> is played in a version (<C>plan/model/roll.ts</C>). A first play opens in the first key of its track and at its starting tempo. After that the newest rating of the block tilts the dice: {Math.round(ROLL.low.back * 100)}% the version before after 1 or 2 stars, {Math.round(ROLL.mid.move * 100)}% a move after 3, {Math.round(ROLL.high.move * 100)}% a move after 4 or 5, else the same again. A move is one part, by weight (tempo {ROLL.weights.bpm}, key {ROLL.weights.key}), and keeps the earlier values as chips. The dice are seeded by the player, the block and that rating, so a version changes only when the block is rated again.</>}>
          {rolled.length ? (
            <Table
              head={["Block", "Last play", "Odds: back / same / move", "Dice", "Moves in", "Outcome", "Given", "If rated 1", "If rated 3", "If rated 5"]}
              rows={rolled.map((p) => {
                const r = p.roll!;
                const e = day.exercises.find((x) => x.blockId === p.blockId);
                const next = (stars: 1 | 3 | 5) => { const v = e ? nextVersion(e, d, seed, stars) : null; return v ? <span key={stars}>{version(v.given)}<span className="block text-[10px] text-slate-500">{v.roll?.outcome}{v.roll?.moved ? `: ${PART_NAME[v.roll.moved]}` : ""}</span></span> : "–"; };
                return [
                  <span key="t" className="text-slate-100">{p.title}<span className="block font-mono text-[10px] text-slate-500">{p.blockId}</span></span>,
                  r.last ? <span key="l">{version(r.last.given)} <span className="text-amber-200">{r.last.stars}★</span></span> : "first play",
                  r.last ? `${pct(r.odds.back)} / ${pct(r.odds.same)} / ${pct(r.odds.move)}` : "–",
                  r.draws.length ? r.draws.map((x) => x.toFixed(2)).join(", ") : "–",
                  r.movesIn.length ? r.movesIn.map((m) => `${PART_NAME[m.part]} ${m.weight} (to ${m.part === "key" ? keyName(m.to) : m.to})`).join(" · ") : "–",
                  <b key="o" className="text-sky-100">{r.outcome}{r.moved ? `: ${PART_NAME[r.moved]}` : ""}</b>,
                  p.given ? version(p.given) : "–",
                  next(1), next(3), next(5),
                ];
              })}
            />
          ) : <p className="text-xs text-slate-500">No exercise of this day has moves.</p>}
          <p className="mt-2 text-xs text-slate-500">{rolled.length} of this day&apos;s {trace.picks.length} picks have moves; {withMoves} of the {blocks.length} blocks in these areas do. The last three columns are the roll the composer would make next for each rating of the version shown.</p>
        </Stage>

        <Stage n={7} title="The day" rule="As it is stored: the day's steps in pick order, review last. Short means the library ran out more than 5 minutes under the budget.">
          <ol className="flex flex-col gap-1 text-xs text-slate-300">
            {day.exercises.map((e, i) => (
              <li key={e.blockId ?? i} className="flex flex-wrap items-baseline gap-2">
                <span className="w-5 tabular-nums text-slate-500">{i + 1}</span>
                <span className="text-slate-100">{shownTitle(e)}</span>
                <span className="text-slate-500">{e.minutes} min</span>
                {(e.steps ?? []).map((r) => <StepChip key={r} refId={r} />)}
                {e.given && <span className="text-sky-200">{version(e.given)}</span>}
              </li>
            ))}
          </ol>
          <p className={`mt-2 text-xs ${day.short ? "text-amber-300" : "text-slate-500"}`}>{trace.minutes.filled} of {trace.minutes.budget} minutes{day.short ? ": short, the library has no more for these steps" : ""}</p>
        </Stage>
      </ol>
      </>}
    </div>
  );
}
