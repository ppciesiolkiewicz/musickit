import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { applyChoiceSet, readChoiceSet } from "@/features/plan/model/choiceSet";
import type { Block } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import type { LibraryRepo } from "./repo";
import type { BlockChoice, BlockDetail, BlockFilter, BlockSlot, BlockOrder, BlockSummary, ComposeBlock, ConceptCoverage, CoverageRow, Scope, StepCoverage } from "./types";

/*
 * Every value from a caller is a bound parameter (`${...}` in `sql`); nothing is spliced into the text. Player ids are compared
 * as text (`user_id::text = $1`), so an id that is not a UUID matches nothing instead of throwing. Ids order with `collate "C"`
 * (bytewise), as the memory repo's `<` does.
 */

/** A text[] built from bound parameters (drizzle spreads a bare JS array into a list, not an array). */
const textArray = (xs: string[]): SQL => sql`array[${sql.join(xs.map((x) => sql`${x}`), sql`, `)}]::text[]`;

/** Rows past the end are dropped as `slice(0, limit)` would. */
const limitOf = (limit: number) => (Number.isFinite(limit) ? sql`limit ${Math.max(0, Math.floor(limit))}` : limit > 0 ? sql`` : sql`limit 0`);

/** The choices a scope lists, as a condition on `c`: the active ones, or all with `includeNotEnabled`. */
const listedChoice = (scope: Scope): SQL => (scope.includeNotEnabled === true ? sql`true` : sql`c.active`);

/**
 * The visibility rule for the block whose id is `id`: the player owns it; or it is curated with an active choice (any curated
 * block with `includeNotEnabled`); or, with `includeNotEnabled`, the app owns it. A hashed block is otherwise its owners' only.
 */
function blockVisible(scope: Scope, id: SQL): SQL {
  const parts: SQL[] = [
    sql`exists (select 1 from blocks vb where vb.id = ${id} and vb.kind = 'curated' and ${scope.includeNotEnabled === true ? sql`true` : sql`exists (select 1 from choices c where c.block_id = vb.id and c.active)`})`,
  ];
  if (scope.player !== undefined) parts.push(sql`exists (select 1 from block_owners o where o.block_id = ${id} and o.user_id::text = ${scope.player})`);
  if (scope.includeNotEnabled === true) parts.push(sql`exists (select 1 from block_owners o where o.block_id = ${id} and o.user_id is null)`);
  return sql`(${sql.join(parts, sql` or `)})`;
}

/** What each block serves, `(block_id, choice_id, level, steps)`: a hashed block its own level and steps, a curated block each listed choice. */
const units = (scope: Scope): SQL => sql`(
  select c.block_id, c.id as choice_id, c.level, c.steps from choices c join blocks cb on cb.id = c.block_id where cb.kind = 'curated' and ${listedChoice(scope)}
  union all
  select hb.id, null, hb.level, hb.steps from blocks hb where hb.kind <> 'curated'
)`;

/** Whether the player owns the block whose id is `id`. */
const owns = (player: string, id: SQL): SQL => sql`exists (select 1 from block_owners o where o.block_id = ${id} and o.user_id::text = ${player})`;

/**
 * One row per (day timer row, block) where the timer counted seconds on the block: the positive numbers in `spent` of the slots
 * `blocks` maps to that block, added. A row whose `blocks` or `spent` is not an object, a slot mapped to anything but a string, and a slot whose `spent` is not a number add nothing.
 */
function timed(player?: string, ids?: SQL): SQL {
  const who = player !== undefined ? sql`and t.user_id::text = ${player}` : sql``;
  const only = ids !== undefined ? sql`and (b.value #>> '{}') = any(${ids})` : sql``;
  return sql`(
    select s.block_id, sum(s.secs) as seconds
    from (
      select t.user_id, t.plan_id, t.day, b.value #>> '{}' as block_id,
        case when jsonb_typeof(t.spent) = 'object' and jsonb_typeof(t.spent -> b.key) = 'number' then (t.spent ->> b.key)::float8 end as secs
      from plan_day_times t
      cross join lateral jsonb_each(case when jsonb_typeof(t.blocks) = 'object' then t.blocks else '{}'::jsonb end) b
      where jsonb_typeof(b.value) = 'string' ${who} ${only}
    ) s
    where s.secs > 0 and s.block_id is not null
    group by s.user_id, s.plan_id, s.day, s.block_id
  )`;
}

/** Times and seconds per block id; with `ids` (a SQL list of block ids), only those blocks are summed. */
const timeTotals = (player?: string, ids?: SQL): SQL =>
  sql`(select block_id, count(*)::int as times, sum(seconds)::float8 as seconds from ${timed(player, ids)} tr group by block_id)`;

/** Ratings of every player per block id: how many, and how many at each star (compared as text, so a bad entry throws nothing). */
const ratingTotals = sql`(
  select block_id, count(*)::int as rated,
    count(*) filter (where entry ->> 'stars' = '1')::int as s1, count(*) filter (where entry ->> 'stars' = '2')::int as s2,
    count(*) filter (where entry ->> 'stars' = '3')::int as s3, count(*) filter (where entry ->> 'stars' = '4')::int as s4,
    count(*) filter (where entry ->> 'stars' = '5')::int as s5
  from progress_entries where block_id is not null group by block_id
)`;

/** The player's latest rating per choice id (the rule of `latestRating`), for the choices in `ids`. */
const latestChoiceRating = (player: string, ids: SQL): SQL => sql`(
  select distinct on (choice_id) choice_id,
    case when entry ->> 'stars' in ('1', '2', '3', '4', '5') then (entry ->> 'stars')::int end as stars,
    case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end as at
  from progress_entries
  where choice_id is not null and user_id::text = ${player} and choice_id = any(${ids})
  order by choice_id, (case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end) collate "C" desc nulls last, exercise_id collate "C"
)`;

/** The player's latest rating per block id: latest string `at` (bytewise), an entry without one last, then the lowest exercise id. */
const latestRating = (player: string, ids?: SQL): SQL => sql`(
  select distinct on (block_id) block_id,
    case when entry ->> 'stars' in ('1', '2', '3', '4', '5') then (entry ->> 'stars')::int end as stars,
    case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end as at
  from progress_entries
  where block_id is not null and user_id::text = ${player} ${ids !== undefined ? sql`and block_id = any(${ids})` : sql``}
  order by block_id, (case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end) collate "C" desc nulls last, exercise_id collate "C"
)`;

interface BlockRow {
  id: string; kind: string; choices: BlockChoice[]; title: string; area: string | null; topic: string | null; concepts: string[]; level: string | null; steps: string[]; tags: string[];
  model: string | null; prompt_version: number | null; docs_agents: number | null; docs_teaching: number | null;
  content: Block; parent_id: string | null;
  minutes: number | null; why: string | null; learn_before: string[] | null; explore_more: string[] | null;
  times: number; seconds: number; rated: number; s1: number; s2: number; s3: number; s4: number; s5: number;
  my_stars: number | null; my_at: string | null; my_times: number; my_seconds: number;
}

/** The block filter as SQL over `b` and the joined `l` (the player's latest rating). */
function blockWhere(scope: Scope, f: BlockFilter): SQL {
  const parts: SQL[] = [blockVisible(scope, sql`b.id`)];
  if (f.area !== undefined) parts.push(sql`b.area = ${f.area}`);
  if (f.topic !== undefined) parts.push(sql`b.topic = ${f.topic}`);
  if (f.level !== undefined) parts.push(sql`exists (select 1 from ${units(scope)} u where u.block_id = b.id and u.level = ${f.level})`);
  if (f.model !== undefined) parts.push(sql`b.model = ${f.model}`);
  if (f.promptVersion !== undefined) parts.push(sql`b.prompt_version = ${f.promptVersion}`);
  if (f.docsAgents !== undefined) parts.push(sql`b.docs_agents = ${f.docsAgents}`);
  if (f.docsTeaching !== undefined) parts.push(sql`b.docs_teaching = ${f.docsTeaching}`);
  if (f.concepts?.length) parts.push(sql`b.concepts && ${textArray(f.concepts)}`);
  if (f.steps?.length) parts.push(sql`exists (select 1 from ${units(scope)} u where u.block_id = b.id and u.steps && ${textArray(f.steps)})`);
  if (f.tags?.length) parts.push(sql`b.tags @> ${textArray(f.tags)}`);
  if (f.player !== undefined) {
    if (scope.player === undefined) parts.push(sql`false`);
    else if (f.player === "unused") parts.push(sql`not ${owns(scope.player, sql`b.id`)}`);
    else {
      parts.push(owns(scope.player, sql`b.id`));
      if (f.player === "repeat") parts.push(sql`l.stars <= 3`);
    }
  }
  return sql.join(parts, sql` and `);
}

/** The blocks matching, with their totals and, with a player, the player's own. */
function blockQuery(scope: Scope, where: SQL, tail: SQL): SQL {
  const p = scope.player;
  const mine = p !== undefined
    ? sql`, l.stars as my_stars, l.at as my_at, coalesce(m.times, 0) as my_times, coalesce(m.seconds, 0)::float8 as my_seconds`
    : sql``;
  const mineJoins = p !== undefined
    ? sql`left join ${latestRating(p)} l on l.block_id = b.id left join ${timeTotals(p)} m on m.block_id = b.id`
    : sql``;
  return sql`
    select b.id, b.kind,
      (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'level', c.level, 'steps', to_jsonb(c.steps), 'moves', c.moves, 'minutes', c.minutes, 'active', c.active)
          || (case when c.set <> '{}'::jsonb then jsonb_build_object('set', c.set) else '{}'::jsonb end)
        order by c.place, c.id collate "C"), '[]'::jsonb) from choices c where c.block_id = b.id and b.kind = 'curated' and ${listedChoice(scope)}) as choices,
      (case when jsonb_typeof(b.content -> 'title') = 'string' then b.content ->> 'title' else '' end) as title, b.area, b.topic, b.concepts, b.level, b.steps, b.tags,
      b.model, b.prompt_version, b.docs_agents, b.docs_teaching, b.content, b.parent_id, b.minutes, b.why, b.learn_before, b.explore_more,
      coalesce(u.times, 0) as times, coalesce(u.seconds, 0)::float8 as seconds,
      coalesce(r.rated, 0) as rated, coalesce(r.s1, 0) as s1, coalesce(r.s2, 0) as s2, coalesce(r.s3, 0) as s3, coalesce(r.s4, 0) as s4, coalesce(r.s5, 0) as s5
      ${mine}
    from blocks b
    left join ${timeTotals()} u on u.block_id = b.id
    left join ${ratingTotals} r on r.block_id = b.id
    ${mineJoins}
    where ${where}
    ${tail}`;
}

function summaryOf(scope: Scope, r: BlockRow): BlockSummary {
  const curated = r.kind === "curated";
  return {
    id: r.id, title: r.title, area: r.area, topic: r.topic, concepts: r.concepts,
    level: curated ? (r.choices[0]?.level ?? null) : r.level,
    steps: curated ? [...new Set(r.choices.flatMap((c) => c.steps))] : r.steps,
    choices: r.choices, tags: r.tags,
    provenance: { model: r.model, promptVersion: r.prompt_version, docsAgents: r.docs_agents, docsTeaching: r.docs_teaching },
    use: { times: r.times, seconds: r.seconds, rated: r.rated, stars: [r.s1, r.s2, r.s3, r.s4, r.s5] },
    ...(scope.player !== undefined ? { mine: { stars: r.my_stars as Stars | null, ratedAt: r.my_at, times: r.my_times, seconds: r.my_seconds } } : {}),
  };
}

/** The slot a block row holds, or null when it has no minutes. */
function slotOf(r: BlockRow): BlockSlot | null {
  if (r.minutes === null) return null;
  return { minutes: r.minutes, ...(r.why ? { why: r.why } : {}), ...(r.learn_before?.length ? { learnBefore: r.learn_before } : {}), ...(r.explore_more?.length ? { exploreMore: r.explore_more } : {}) };
}

/** The library over Postgres: the same rules as `repo.memory.ts`, held to `repoContract.ts` by `npm run test:library-db`. */
export function drizzleLibraryRepo(db: Db): LibraryRepo {
  const rows = async <T>(q: SQL): Promise<T[]> => [...(await db.execute(q))] as T[];

  return {
    async countBlocks(scope, filter) {
      const p = scope.player;
      const join = p !== undefined && filter.player === "repeat" ? sql`left join ${latestRating(p)} l on l.block_id = b.id` : sql``;
      const [r] = await rows<{ n: number }>(sql`select count(*)::int as n from blocks b ${join} where ${blockWhere(scope, filter)}`);
      return r.n;
    },
    async listBlocks(scope, filter, order: BlockOrder, limit) {
      // `l` is joined only with a player; the repeat filter is `false` without one, so it never names `l` then
      const by = order === "newest" ? sql`order by b.created_at desc, b.id collate "C"` : sql`order by seconds, times, b.id collate "C"`;
      const list = await rows<BlockRow>(blockQuery(scope, blockWhere(scope, filter), sql`${by} ${limitOf(limit)}`));
      return list.map((r) => summaryOf(scope, r));
    },
    async getBlock(scope, id): Promise<BlockDetail | null> {
      const [r] = await rows<BlockRow>(blockQuery(scope, sql`b.id = ${id} and ${blockVisible(scope, sql`b.id`)}`, sql``));
      return r ? { ...summaryOf(scope, r), content: r.content, parentId: r.parent_id, slot: slotOf(r) } : null;
    },
    async coverage(scope) {
      // the units of visible blocks with their block's totals
      const ctes = sql`with
        vb as (select b.id, b.topic, b.concepts, coalesce(u.times, 0) as times, coalesce(u.seconds, 0)::float8 as seconds
          from blocks b left join ${timeTotals()} u on u.block_id = b.id where ${blockVisible(scope, sql`b.id`)}),
        vu as (select v.id, v.topic, v.times, v.seconds, un.choice_id, un.level, un.steps from vb v join ${units(scope)} un on un.block_id = v.id)`;
      // a block's time once per row, however many of its units match
      const once = (where: SQL) => sql`(select coalesce(sum(d.times), 0)::int as times, coalesce(sum(d.seconds), 0)::float8 as seconds
        from (select distinct o.id, o.times, o.seconds from vu o where ${where}) d)`;
      const topics = await rows<CoverageRow>(sql`${ctes}
        select x.topic, x.level, count(*)::int as blocks,
          (select t.times from ${once(sql`o.topic = x.topic and o.level = x.level`)} t) as times,
          (select t.seconds from ${once(sql`o.topic = x.topic and o.level = x.level`)} t) as seconds
        from vu x
        where x.topic is not null and x.level is not null
        group by x.topic, x.level
        order by x.topic collate "C", x.level collate "C"`);
      const concepts = await rows<ConceptCoverage>(sql`${ctes}
        select vc.concept, count(*)::int as blocks,
          sum(vc.times)::int as times, sum(vc.seconds)::float8 as seconds
        from (select distinct v.id, c.concept, v.times, v.seconds from vb v cross join lateral unnest(v.concepts) c(concept)) vc
        group by vc.concept
        order by vc.concept collate "C"`);
      const steps = await rows<StepCoverage>(sql`${ctes}
        select vs.step, count(*)::int as blocks,
          (select t.times from ${once(sql`vs.step = any(o.steps)`)} t) as times,
          (select t.seconds from ${once(sql`vs.step = any(o.steps)`)} t) as seconds
        from (select distinct v.id, v.choice_id, s.step from vu v cross join lateral unnest(v.steps) s(step)) vs
        group by vs.step
        order by vs.step collate "C"`);
      return { topics: topics.map((t) => ({ ...t })), concepts: concepts.map((c) => ({ ...c })), steps: steps.map((s) => ({ ...s })) };
    },
    async composeBlocks(player, areas): Promise<ComposeBlock[]> {
      if (areas.length === 0) return [];
      // the candidates first (one per active choice that names a step, or of a warm-up), so the totals are summed for these only
      const list = await rows<{
        id: string; choice_id: string; content: Block; area: string; topic: string | null; concepts: string[]; steps: string[]; level: string | null; tags: string[];
        minutes: number; moves: Block["moves"] | null; set: unknown; why: string | null; learn_before: string[] | null; explore_more: string[] | null;
        times: number; seconds: number; my_stars: number | null; my_at: string | null;
      }>(sql`
        with cand as (
          select b.id, b.content, b.area, b.topic, b.concepts, b.tags, b.why, b.learn_before, b.explore_more,
            c.id as choice_id, c.level, c.steps, c.minutes, c.moves, c.set, c.place
          from blocks b join choices c on c.block_id = b.id
          where b.kind = 'curated' and b.area = any(${textArray(areas)}) and c.active and (cardinality(c.steps) > 0 or b.content->>'kind' = 'warm-up')
        )
        select c.id, c.choice_id, c.content, c.area, c.topic, c.concepts, c.steps, c.level, c.tags, c.minutes, c.moves, c.set, c.why, c.learn_before, c.explore_more,
          coalesce(u.times, 0) as times, coalesce(u.seconds, 0)::float8 as seconds, l.stars as my_stars, l.at as my_at
        from cand c
        left join ${timeTotals(undefined, sql`(select id from cand)`)} u on u.block_id = c.id
        left join ${latestChoiceRating(player, sql`(select choice_id from cand)`)} l on l.choice_id = c.choice_id
        order by c.id collate "C", c.place, c.choice_id collate "C"`);
      return list.map((r) => {
        // the block's content as the choice draws it (its set) and with the choice's moves (a curated block's content has none of its own)
        const content: Block = applyChoiceSet({ ...r.content }, readChoiceSet(r.set));
        delete content.moves;
        if (r.moves) content.moves = r.moves;
        return {
          id: r.id, choiceId: r.choice_id, content, area: r.area, topic: r.topic, concepts: r.concepts, steps: r.steps, level: r.level, tags: r.tags,
          slot: slotOf({ minutes: r.minutes, why: r.why, learn_before: r.learn_before, explore_more: r.explore_more } as BlockRow)!,
          use: { times: r.times, seconds: r.seconds },
          // a rating row whose stars are not 1 to 5 reads as never rated
          mine: r.my_stars !== null ? { stars: r.my_stars as Stars, ratedAt: r.my_at ?? "" } : null,
        };
      });
    },
    async userExists(id) {
      const found = await rows<{ one: number }>(sql`select 1 as one from users where id::text = ${id} limit 1`);
      return found.length > 0;
    },
  };
}
