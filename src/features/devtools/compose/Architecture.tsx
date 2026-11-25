import type { ReactNode } from "react";

/*
 * /admin/dev/compose → "Architecture": how the plan algorithm is put together. Who asks for a plan, what the server reads
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
  ["answers", <>The <C>answers</C> saved in the player&apos;s plan document: what they picked in the first questionnaire. They go through <C>raisedAnswers</C> first, which raises a topic one level at a time as far as the player&apos;s ratings have reached. For a teacher&apos;s student, the teacher&apos;s score for a topic replaces the answer as the starting level.</>, <>Reads four things from them: the areas the player practices, the minutes a day, the answer to the keys question, and the line of each topic. A topic&apos;s line sets the step its tracks start on and how many new steps the topic offers at once.</>],
  ["solid", <>Every rating the player has made (their progress entries), reduced by <C>solidRatedAt</C> to one map: a step, and the time of its newest rating. A step is in the map only when that newest rating is 4 stars or more. An older rating of the same step is not looked at.</>, <>Two uses. A solid step counts as known, which brings the steps after it within reach. And the solid steps are the review list, the one rated longest ago first.</>],
  ["blocks", <><C>library.composeBlocks(player, areas)</C>, with each row turned into a candidate by <C>candidateOf</C>. There is one candidate for each active choice of a curated block in the player&apos;s areas, when the choice names at least one step. A candidate carries the choice&apos;s minutes and moves, how much all players have used the block, and this player&apos;s newest rating of the choice.</>, <>These are the only exercises a day can hold. The composer writes no exercise and changes none.</>],
  ["date", <>The page sends its local date. The server refuses a date more than one day away from its own.</>, <>Decides which topic goes first in the day (it moves on by one each date), and is part of the seed.</>],
  ["yesterday", <>The choice ids of the newest day the composer made for this player before <C>date</C>. A plan shared with the player is never read for this.</>, <>These choices are not picked today. Another choice of the same block may be.</>],
  ["keep", <>Only when the player asks for another plan (<C>another</C>): the exercises of today&apos;s plan that they have already rated.</>, <>They stay in the day as they are, first in the list, and their minutes come off the budget.</>],
  ["declined", <>Only with <C>another</C>: the choice ids the player turned down earlier today, and today&apos;s exercises they have not rated.</>, <>Not picked again today.</>],
  ["seed", <>The text <C>{"`${player}:${date}:${attempt}`"}</C>. The attempt goes up by one each time the player asks for another plan.</>, <>The only source of randomness in the picks: which unrated choice, and which three keys of a long rung. The same input always gives the same day.</>],
  ["history", <>Every progress entry of the player, as it is.</>, <>Used for exercise versions only. A choice&apos;s exercise version is rolled from the player&apos;s rows with that <C>choiceId</C> (a row with no choice id belongs to no choice), with dice seeded by the player, the choice id and the newest of those rows. The keys a player has earned are counted per track from the same rows.</>],
  ["player", <>The signed-in player. For a teacher&apos;s week, the student.</>, <>The player the versions are rolled for.</>],
];

/** The calls inside `composeDay`, in order, with the stage of the "One day" view that shows each. */
const INSIDE: { n: string; name: string; file: string; text: ReactNode; calls?: { name: string; file: string; text: ReactNode }[] }[] = [
  {
    n: "2", name: "daySteps", file: "plan/model/daySteps.ts",
    text: <>First <C>dayAreas</C> (<C>plan/model/compose.ts</C>) splits the day into sections, one area each: one section under 30 minutes, two from 30 to 49, three from 50, never more than the areas the player picked. Which areas a day gets turns with the date. The order is voice, guitar, theory. Then <C>daySteps</C> runs once for each section, with that section&apos;s area, and decides which steps of the path the section works on, as three lists. <C>fresh</C>: steps within reach and not solid, one from each topic before a second from any topic. <C>open</C>: steps that are ready but over their topic&apos;s limit. <C>review</C>: solid steps, the one rated longest ago first.</>,
    calls: [
      { name: "reach", file: "plan/model/reach.ts", text: <>Marks every step of the path as known, within reach or ahead. Known comes from the questionnaire and from solid ratings, and it carries back: everything a known step needs first is known too.</> },
      { name: "placement", file: "plan/intake/placement.ts", text: <>From a topic&apos;s line, the step each of the topic&apos;s tracks starts on.</> },
      { name: "PATH", file: "plan/model/path.ts", text: <>The tracks, their steps and what each step needs first. This is data, not logic: the composer has no rule about any one step.</> },
    ],
  },
  {
    n: "3", name: "withinReach", file: "plan/model/compose.ts",
    text: <>Drops every candidate that names a step marked ahead. Beside it, the barred set <C>used</C> is started: yesterday&apos;s choices, the declined choices, the kept choices, and the blocks of the kept choices.</>,
    calls: [{ name: "reach", file: "plan/model/reach.ts", text: <>The same marks as for the day&apos;s steps.</> }],
  },
  {
    n: "4", name: "fill", file: "plan/model/compose.ts",
    text: <>Runs once for each section, with the section&apos;s budget: the day&apos;s minutes split evenly between the sections, less what the section has kept. What a section could not fill goes to the next one, and what the last one could not fill goes back to the earlier ones. A kept exercise stays in the section of its area. A voice or a guitar section first takes its warm-up run out of the budget (<C>warmUpRun</C>, <C>plan/model/warmUp.ts</C>: blocks marked <C>kind: &quot;warm-up&quot;</C>, at most a third of the section and 8 minutes, turning with the date); a warm-up is never a candidate for a step. Then it adds exercises until the section&apos;s budget is full, in five passes: planned review (1 exercise a section; 2 on a one-section day of 30 minutes or more; each at most a third of the day), one exercise for each fresh step, one for each open step, more rounds over the steps of the day, then more review. It stops when the minutes are full or when a whole round adds nothing.</>,
    calls: [
      { name: "pickFor", file: "plan/model/compose.ts", text: <>Finds a choice for one step, never from a block already in the day. When the step has none left, it tries the step before it on the same track, then the one before that.</> },
      { name: "fits", file: "plan/model/compose.ts", text: <>A choice fits a step when it names that step and no later step of the same track.</> },
      { name: "choose", file: "plan/model/compose.ts", text: <>Picks among the choices that fit. First one the player rated under Solid, the most recently rated. Else one never rated, at random among the least used. Else the solid one rated longest ago. Ties go by choice id.</> },
    ],
  },
  {
    n: "5", name: "versionFor → keysFor", file: "plan/model/compose.ts",
    text: <>Runs for every exercise after all picks are made, and changes no pick. For a block with a Key selector and no moves: the exercise gets the keys of the player&apos;s rung.</>,
    calls: [
      { name: "keyRung", file: "plan/model/keys.ts", text: <>The player&apos;s rung on the key ladder of the exercise&apos;s area: the answer to the keys question, or with no answer, a rung from the level in the area.</> },
      { name: "exerciseKeys", file: "plan/model/keys.ts", text: <>At most three keys of that rung (where the rung has more, a different three by the seed) and the three nearest keys of the rungs below.</> },
    ],
  },
  {
    n: "6", name: "versionFor → rollVersion", file: "plan/model/roll.ts",
    text: <>The same call, for a block with moves: the exercise gets a rolled exercise version (keys and tempo). The newest rating of the choice sets the chances of going back, staying the same or making one move.</>,
    calls: [
      { name: "keyTrackOf, playerKeys", file: "plan/model/keyStages.ts", text: <>The track whose key order the exercise follows (the track of the first step it names), and the player&apos;s keys there: the first key, the keys open on the step, the keys earned on the track.</> },
      { name: "rollSeed", file: "plan/model/compose.ts", text: <>The seed of the dice: the player, the choice id and the newest rated row of that choice. An exercise version changes only when the choice is rated again.</> },
      { name: "warmUpKeyPool, warmUpKeys", file: "plan/model/warmUp.ts", text: <>For a warm-up that can change key, in place of the roll (a warm-up names no step, so it has no track of keys): the keys its section&apos;s exercises open in today and the keys a fifth above and below them, and the next key of that list each time the warm-up comes round. Its tempo is still rolled.</> },
    ],
  },
];

const HOLDS: ReactNode[] = [
  <>The composer is pure. <C>composeDay</C> reads no clock, no database and no network. Everything it needs arrives in its input, which is why tests and this page can run the real one.</>,
  <>The server never writes a player&apos;s day. The route answers with the day and the page stores it (<C>startDay</C>, <C>anotherDay</C>); both are safe to call twice. A teacher&apos;s week is the one plan the server writes itself.</>,
  <>Nothing blocks a player. A step that is ahead is only ranked later, and a step with no exercise left falls back to an earlier step of its track.</>,
  <>A block is stored as it was written. Its minutes, its reason and its links belong to the slot in the plan, and the keys given to it are stored with the exercise in the plan, not in the block.</>,
  <>The same choice never comes two days running, and a block never comes twice in one day, not even as two different choices.</>,
  <>A day that ends more than 5 minutes under its budget is marked <C>short</C>: the library has no more for these steps. When the kept exercises leave 5 minutes or less, the composer fills a whole new day&apos;s minutes instead of the rest.</>,
  <>A teacher&apos;s student never gets a day composed here: the route answers <C>409 taught</C> before it reads anything.</>,
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
  ["library/server/repo.ts", <><C>composeBlocks</C>: the choices a day can be made from.</>],
  ["devtools/model/composeLab.ts", <>This page&apos;s stand-ins: <C>seedCandidates</C>, <C>simulate</C>.</>],
];

/** One stored table or type: its name, where it is defined, its fields that matter here, and a line on what it is. */
function Entity({ layer, name, file, fields, children }: { layer: Layer; name: string; file: string; fields: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${LAYER[layer].box}`}>
      <p className="font-mono text-xs font-semibold text-slate-100">{name}</p>
      <p className="font-mono text-[10px] text-slate-500">{file}</p>
      {children && <p className="mt-1 text-xs leading-relaxed text-slate-300">{children}</p>}
      <dl className="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 border-t border-slate-700/60 pt-1.5 text-[11px]">
        {fields.map(([f, what]) => (
          <div key={f} className="contents">
            <dt className="font-mono text-slate-200">{f}</dt>
            <dd className="text-slate-400">{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A link between two entities, read across: how many of one to how many of the other, and by which field. */
function Link({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-2 py-1 pl-4 text-[11px] text-slate-400"><span aria-hidden className="text-base leading-none text-slate-500">↓</span><span>{children}</span></p>;
}

/** The data the composer works on: the library tables, the block inside a row (cells, choices, tools), the player's rows, and the shapes the code turns them into. */
function DataPanel() {
  return (
    <Panel title="The data" note={<>What a day is made from, from the database rows down to the tool a player sees. Green boxes are tables in <C>src/lib/db/schema.ts</C>; blue boxes are the types the code reads them into. Read each column from the top: an arrow says how one box points at the next. Paths start at <C>src/features</C> unless they start with <C>lib</C>.</>}>
      <div className="grid gap-4 desk:grid-cols-3">
        <Column title="The library (shared)">
          <Entity layer="data" name="blocks" file="lib/db/schema.ts" fields={[
            ["id", <>a curated block&apos;s readable id (the seed file&apos;s name); else the hash of content and tags</>],
            ["kind", <><C>curated</C> (seed, updated in place) or <C>hashed</C> (insert-only)</>],
            ["content", <>the <C>Block</C>: title, choice, moves, cells (right column)</>],
            ["area, topic, concepts, tags", <>what it practices; <C>composeBlocks</C> filters by area</>],
            ["minutes, why, learnBefore, exploreMore", <>the default slot</>],
            ["steps, level", <>empty on a curated block: they live on its choices</>],
          ]}>One row per distinct block, whoever has it. Never deleted.</Entity>
          <Link>one block has many <C>choices</C> (<C>choices.blockId</C>)</Link>
          <Entity layer="data" name="choices" file="lib/db/schema.ts" fields={[
            ["id", <><C>{"<blockId>/<name>"}</C></>],
            ["name, place", <>unique within the block, and its order</>],
            ["level, steps", <>the path steps this way of playing it practices (<C>caged:7</C>)</>],
            ["moves", <>what may change between plays: any key, a tempo range (<C>Moves</C>, <C>plan/model/moves.ts</C>)</>],
            ["minutes", <>the slot&apos;s minutes for this choice</>],
            ["active", <>false once it leaves the seed; only active choices are candidates</>],
          ]}>One way to play a curated block. The seed writes them from a file&apos;s <C>choices</C>. The composer picks choices, never blocks.</Entity>
          <Link>who has it</Link>
          <Entity layer="data" name="block_owners" file="lib/db/schema.ts" fields={[
            ["block_owners", <>owner and block; <C>userId</C> null is the app (seed blocks)</>],
          ]}>Not read by the composer. A candidate&apos;s <C>use</C> comes from <C>plan_day_times</C>, the day timer&apos;s rows of every player.</Entity>
        </Column>

        <Column title="Inside a block (content)">
          <Entity layer="pure" name="Block" file="plan/model/types.ts" fields={[
            ["title", <>the exercise&apos;s name</>],
            ["choice?", <>a choice over every cell (below)</>],
            ["moves?", <>as on the choice row, for a block with no choices</>],
            ["cells", <><C>Cell[]</C>, at most 24 counted through sections</>],
          ]}>The JSON in <C>blocks.content</C>, and the body of every exercise in a plan.</Entity>
          <Link>cells, in order</Link>
          <Entity layer="pure" name="Cell" file="plan/model/tools.ts" fields={[
            ["text", <>a paragraph</>],
            ["list", <>numbered steps</>],
            ["notice", <><C>headphones</C></>],
            ["tool", <>one <C>PlanTool</C>, set up</>],
            ["section", <>heading, minutes (a timed block), its own <C>choice</C>, its own cells (no sections)</>],
          ]} />
          <Link>a section&apos;s or block&apos;s <C>choice</C> sets the tools under it</Link>
          <Entity layer="pure" name="Choice · ChoiceOption" file="plan/model/tools.ts · plan/model/choice.ts" fields={[
            ["options", <>2-4 chips (key, scale, bpm, position, level); the tools are written in option 1</>],
            ["open", <>one value per part, any value: a picker such as the Key selector</>],
            ["pinned (on a tool)", <>parts the tool keeps its own value for</>],
          ]}>Not the <C>choices</C> table: this is the selector a player clicks inside the exercise. The composer&apos;s keys (<C>keysFor</C>) fill a block&apos;s Key selector.</Entity>
          <Link>a tool cell holds</Link>
          <Entity layer="pure" name="PlanTool" file="plan/model/tools.ts" fields={[
            ["type", <>the component in <C>src/features/exercises</C>: <C>caged-neck</C>, <C>scale-neck</C>, <C>guitar-play-along</C>, …</>],
            ["…props", <>its props, parsed by <C>parseTool</C>: keys as pitch classes, degrees as semitones</>],
          ]}>The tool on the page. The composer never looks inside one: it only sets the version (<C>given</C>) the reader draws it with.</Entity>
        </Column>

        <Column title="The player (private)">
          <Entity layer="data" name="user_documents (kind plan)" file="lib/db/schema.ts" fields={[
            ["data.answers", <>the questionnaire: areas, minutes, keys, topic lines → <C>answers</C></>],
            ["data.current, data.history", <>stored plans; a composed day carries <C>composed</C> (attempt, declined) → <C>yesterday</C>, <C>keep</C>, <C>declined</C></>],
            ["version", <>+1 a write; a stale write is refused</>],
          ]}>One JSON document per player and kind, read by <C>readDoc</C>.</Entity>
          <Link>a slot in a stored plan is rated as</Link>
          <Entity layer="data" name="progress_entries" file="lib/db/schema.ts · progress/log.ts" fields={[
            ["exerciseId", <>the slot it rates</>],
            ["blockId, choiceId", <>the block and choice played (not foreign keys)</>],
            ["entry", <><C>ProgressEntry</C>: stars, at, steps, given, planId, day</>],
          ]}>One row per rating, read by <C>readEntries</C> → <C>solid</C>, <C>history</C>, and each candidate&apos;s <C>mine</C>.</Entity>
        </Column>
      </div>

      <Link><C>composeBlocks</C> joins <C>blocks</C> and active <C>choices</C>; <C>candidateOf</C> lays the choice over the block</Link>
      <div className="grid gap-4 desk:grid-cols-2">
        <Entity layer="pure" name="Candidate" file="plan/model/compose.ts" fields={[
          ["blockId, choiceId", <>which block, played which way</>],
          ["steps, minutes", <>from the choice</>],
          ["use", <>times and seconds all players have spent on the block</>],
          ["mine", <>this player&apos;s newest stars on the choice, or null</>],
          ["exercise", <>the <C>PlanExercise</C>, ready to sit in a day</>],
        ]}>What the composer picks from: one per active choice in the player&apos;s areas that names a step.</Entity>
        <Entity layer="pure" name="PlanExercise" file="plan/model/types.ts" fields={[
          ["Block", <>title, choice, moves, cells: the content as stored</>],
          ["ExerciseMeta", <>minutes, why, level, steps, area, topic, concepts, tags, links</>],
          ["given", <>set by the composer: the keys and tempo of this play (<C>versionFor</C>)</>],
          ["id, blockId, choiceId", <>the slot, and what it was made from; ratings point back here</>],
        ]}>One exercise of a day. <C>ComposedDay.exercises</C> is a list of these, stored in the plan document.</Entity>
      </div>
    </Panel>
  );
}

export default function Architecture() {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        {(Object.keys(LAYER) as Layer[]).map((l) => <li key={l} className="flex items-center gap-1.5"><span aria-hidden className={`size-2.5 rounded-full ${LAYER[l].dot}`} />{LAYER[l].label}</li>)}
      </ul>

      <Panel title="Who asks for a plan" note={<>Three places in the code ask for a plan: the player&apos;s Practice plan page, a teacher making a student&apos;s week, and this page. Each collects the same ten inputs in its own way and hands them to <C>composeDay</C>, which does not know who asked. Read a column from top to bottom: a box is one function (its name, its file, what it does), and an arrow says what is passed on to the next one. The three columns meet in <C>composeDay</C>; the row under it shows where each caller puts the result.</>}>
        <div className="grid gap-4 desk:grid-cols-3">
          <Column title="A player's day">
            <Node layer="browser" name="useTodayPlan" file="plan/ui/useTodayPlan.ts">Runs on the Practice plan page. It asks for a day when the player has questionnaire answers and no plan for today yet, or when the player asks for another plan.</Node>
            <Arrow>first saves any unsaved plan changes, then</Arrow>
            <Node layer="browser" name="requestDay" file="plan/store/composeClient.ts"><C>{"POST /api/me/plan/compose { date, another }"}</C></Node>
            <Arrow />
            <Node layer="server" name="composeRoute" file="plan/server/composeRoute.ts">Checks the request: the player must be signed in, and a teacher&apos;s student is refused (<C>409 taught</C>), since their plans come from the teacher.</Node>
            <Arrow><C>player, {"{ date, another }"}</C></Arrow>
            <Node layer="server" name="composeToday" file="plan/server/composeToday.ts">Reads the player&apos;s plan document, ratings and the library, and builds the ten inputs (see What goes in, below).</Node>
          </Column>
          <Column title="A teacher's week">
            <Node layer="browser" name="StudentPage" file="students/ui/StudentPage.tsx">The teacher makes a student&apos;s next week, or a new one in place of this week&apos;s.</Node>
            <Arrow />
            <Node layer="browser" name="postStudentPlan" file="students/client.ts"><C>{"POST /api/students/<id>/plan { today, rotate, scores, comment }"}</C></Node>
            <Arrow />
            <Node layer="server" name="planRoute" file="students/server/http.ts">Checks the request: signed in as this student&apos;s teacher, and <C>today</C> within one day of the server&apos;s date.</Node>
            <Arrow><C>teacher, studentId, {"{ today, rotate, scores, comment }"}</C></Arrow>
            <Node layer="server" name="makeWeek" file="students/server/plans.ts">Saves the topic scores the teacher set with the sliders, then works out the first day of the week and the day before it (for <C>yesterday</C>).</Node>
            <Arrow><C>studentId, {"{ start, seed, today, yesterday }"}</C></Arrow>
            <Node layer="server" name="composeStudentWeek" file="plan/server/composeStudentWeek.ts">Reads the same data as <C>composeToday</C>, for the student, and builds the same inputs.</Node>
            <Arrow />
            <Node layer="pure" name="composeWeek" file="plan/model/compose.ts">Calls <C>composeDay</C> seven times. Each day gets the day before it as its <C>yesterday</C>. The ratings stay the same for all seven, since the student has not played them yet. A day that is not one of the student&apos;s practice days is left empty, and the next practice day gets the last practice day as its <C>yesterday</C>.</Node>
          </Column>
          <Column title="This page">
            <Node layer="browser" name="ComposeLab" file="devtools/compose/ComposeLab.tsx">The One day view. A made-up player, with no server and no database.</Node>
            <Arrow />
            <Node layer="pure" name="seedCandidates" file="devtools/model/composeLab.ts">Stands in for the library: every choice of the seed block files in the code, as never used and never rated.</Node>
            <Arrow />
            <Node layer="pure" name="simulate" file="devtools/model/composeLab.ts">Builds seven days in a row. After each day it rates every exercise with the one rating picked on the page, so the next day sees those ratings.</Node>
          </Column>
        </div>
        <Arrow><C>ComposeInput</C></Arrow>
        <Node layer="pure" name="composeDay(input): ComposedDay" file="plan/model/compose.ts">Builds one day from its input and nothing else. <C>explainDay</C> is the same function, returning the day together with a record of every decision it made (<C>ComposeTrace</C>). The One day view draws that record.</Node>
        <Arrow><C>{"ComposedDay { exercises, steps, short }"}</C></Arrow>
        <div className="grid gap-4 desk:grid-cols-3">
          <Node layer="data" name="startDay / anotherDay" file="plan/model/schedule.ts">A player&apos;s day: the page stores it as the player&apos;s current plan, through <C>PlanStore</C>. An exercise the player has rated is never lost when they ask for another plan.</Node>
          <Node layer="data" name="giveWeek" file="plan/model/schedule.ts">A teacher&apos;s week: <C>makeWeek</C> writes it into the student&apos;s plan document on the server, with a version check so two writes cannot overwrite each other, and the route answers <C>{"{ planId, start, short, comment }"}</C>.</Node>
          <Node layer="browser" name="One day view">This page: the day and its record are drawn on the screen and never stored.</Node>
        </div>
      </Panel>

      <Panel title="What goes in" note={<>The ten fields of <C>ComposeInput</C>, the one object <C>composeDay</C> takes. The middle column says how <C>composeToday</C> builds the field for a player&apos;s day; it reads only three things from the database: the player&apos;s plan document, their progress entries (one per rating) and the library. The last column says what the composer uses the field for.</>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-slate-500"><tr>{["Field", "Where the server gets it (a player's day)", "What the composer does with it"].map((h) => <th key={h} className="py-1 pr-4 font-medium">{h}</th>)}</tr></thead>
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

      <DataPanel />

      <Panel title="Inside composeDay" note={<>What <C>composeDay</C> does, in the order it does it. On the left, the function it calls; on the right, the functions that one calls in turn. The number in the circle is the stage of the One day view that shows the result of the call for a real day. Stage 1 there is the input and stage 7 is the finished day, so neither has a call here.</>}>
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

      <Panel title="What holds" note="The rules the whole design depends on. Each one is relied on by more than one part, so a change that breaks one of them is a change of design, not a fix.">
        <ul className="flex max-w-4xl list-disc flex-col gap-1.5 pl-5 text-xs leading-relaxed text-slate-300">
          {HOLDS.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </Panel>

      <Panel title="Files" note={<>Every file named on this page and what it holds, roughly in the order a request passes through them. Paths start at <C>src/features</C>, except the two route files, which start at <C>src</C>. The design document is <C>docs/superpowers/specs/2026-11-18-plan-composer-design.md</C>.</>}>
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
