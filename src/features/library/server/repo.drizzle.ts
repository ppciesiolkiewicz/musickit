import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import type { Block } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import type { LibraryRepo } from "./repo";
import type { BlockDetail, BlockFilter, BlockOrder, BlockSummary, ConceptCoverage, Count, CoverageRow, PlanDetail, PlanFilter, PlanSummary, Scope, StepCoverage } from "./types";

/*
 * Every value from a caller is a bound parameter (`${...}` in `sql`); nothing is spliced into the text. Player ids are compared
 * as text (`user_id::text = $1`), so an id that is not a UUID matches nothing instead of throwing. Ids order with `collate "C"`
 * (bytewise), as the memory repo's `<` does.
 */

/** A text[] built from bound parameters (drizzle spreads a bare JS array into a list, not an array). */
const textArray = (xs: string[]): SQL => sql`array[${sql.join(xs.map((x) => sql`${x}`), sql`, `)}]::text[]`;

/** Rows past the end are dropped as `slice(0, limit)` would. */
const limitOf = (limit: number) => (Number.isFinite(limit) ? sql`limit ${Math.max(0, Math.floor(limit))}` : limit > 0 ? sql`` : sql`limit 0`);

/** The visibility rule for the block whose id is `id`: an owner row enabled for reuse, the player's own, or the app's with `includeNotEnabled`. */
function blockVisible(scope: Scope, id: SQL): SQL {
  const own = scope.player !== undefined ? sql` or o.user_id::text = ${scope.player}` : sql``;
  const app = scope.includeNotEnabled === true ? sql` or o.user_id is null` : sql``;
  return sql`exists (select 1 from block_owners o where o.block_id = ${id} and (o.enabled_for_reuse${own}${app}))`;
}

/** Whether the player owns the block whose id is `id`. */
const owns = (player: string, id: SQL): SQL => sql`exists (select 1 from block_owners o where o.block_id = ${id} and o.user_id::text = ${player})`;

/**
 * One row per (day timer row, block) where the timer counted seconds on the block: the positive numbers in `spent` of the slots
 * `blocks` maps to that block, added. A row whose `blocks` or `spent` is not an object, a slot mapped to anything but a string, and a slot whose `spent` is not a number add nothing.
 */
function timed(player?: string): SQL {
  const who = player !== undefined ? sql`and t.user_id::text = ${player}` : sql``;
  return sql`(
    select s.block_id, sum(s.secs) as seconds
    from (
      select t.user_id, t.plan_id, t.day, b.value #>> '{}' as block_id,
        case when jsonb_typeof(t.spent) = 'object' and jsonb_typeof(t.spent -> b.key) = 'number' then (t.spent ->> b.key)::float8 end as secs
      from plan_day_times t
      cross join lateral jsonb_each(case when jsonb_typeof(t.blocks) = 'object' then t.blocks else '{}'::jsonb end) b
      where jsonb_typeof(b.value) = 'string' ${who}
    ) s
    where s.secs > 0 and s.block_id is not null
    group by s.user_id, s.plan_id, s.day, s.block_id
  )`;
}

/** Times and seconds per block id. */
const timeTotals = (player?: string): SQL =>
  sql`(select block_id, count(*)::int as times, sum(seconds)::float8 as seconds from ${timed(player)} tr group by block_id)`;

/** Ratings of every player per block id: how many, and how many at each star (compared as text, so a bad entry throws nothing). */
const ratingTotals = sql`(
  select block_id, count(*)::int as rated,
    count(*) filter (where entry ->> 'stars' = '1')::int as s1, count(*) filter (where entry ->> 'stars' = '2')::int as s2,
    count(*) filter (where entry ->> 'stars' = '3')::int as s3, count(*) filter (where entry ->> 'stars' = '4')::int as s4,
    count(*) filter (where entry ->> 'stars' = '5')::int as s5
  from progress_entries where block_id is not null group by block_id
)`;

/** The player's latest rating per block id: latest string `at` (bytewise), an entry without one last, then the lowest exercise id. */
const latestRating = (player: string): SQL => sql`(
  select distinct on (block_id) block_id,
    case when entry ->> 'stars' in ('1', '2', '3', '4', '5') then (entry ->> 'stars')::int end as stars,
    case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end as at
  from progress_entries
  where block_id is not null and user_id::text = ${player}
  order by block_id, (case when jsonb_typeof(entry -> 'at') = 'string' then entry ->> 'at' end) collate "C" desc nulls last, exercise_id collate "C"
)`;

interface BlockRow {
  id: string; title: string; area: string | null; topic: string | null; concepts: string[]; level: string | null; steps: string[]; tags: string[];
  model: string | null; prompt_version: number | null; docs_agents: number | null; docs_teaching: number | null;
  content: Block; parent_id: string | null;
  times: number; seconds: number; rated: number; s1: number; s2: number; s3: number; s4: number; s5: number;
  my_stars: number | null; my_at: string | null; my_times: number; my_seconds: number;
}

/** The block filter as SQL over `b` and the joined `l` (the player's latest rating). */
function blockWhere(scope: Scope, f: BlockFilter): SQL {
  const parts: SQL[] = [blockVisible(scope, sql`b.id`)];
  if (f.area !== undefined) parts.push(sql`b.area = ${f.area}`);
  if (f.topic !== undefined) parts.push(sql`b.topic = ${f.topic}`);
  if (f.level !== undefined) parts.push(sql`b.level = ${f.level}`);
  if (f.model !== undefined) parts.push(sql`b.model = ${f.model}`);
  if (f.promptVersion !== undefined) parts.push(sql`b.prompt_version = ${f.promptVersion}`);
  if (f.docsAgents !== undefined) parts.push(sql`b.docs_agents = ${f.docsAgents}`);
  if (f.docsTeaching !== undefined) parts.push(sql`b.docs_teaching = ${f.docsTeaching}`);
  if (f.concepts?.length) parts.push(sql`b.concepts && ${textArray(f.concepts)}`);
  if (f.steps?.length) parts.push(sql`b.steps && ${textArray(f.steps)}`);
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
    select b.id, (case when jsonb_typeof(b.content -> 'title') = 'string' then b.content ->> 'title' else '' end) as title, b.area, b.topic, b.concepts, b.level, b.steps, b.tags,
      b.model, b.prompt_version, b.docs_agents, b.docs_teaching, b.content, b.parent_id,
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
  return {
    id: r.id, title: r.title, area: r.area, topic: r.topic, concepts: r.concepts, level: r.level, steps: r.steps, tags: r.tags,
    provenance: { model: r.model, promptVersion: r.prompt_version, docsAgents: r.docs_agents, docsTeaching: r.docs_teaching },
    use: { times: r.times, seconds: r.seconds, rated: r.rated, stars: [r.s1, r.s2, r.s3, r.s4, r.s5] },
    ...(scope.player !== undefined ? { mine: { stars: r.my_stars as Stars | null, ratedAt: r.my_at, times: r.my_times, seconds: r.my_seconds } } : {}),
  };
}

/** The plan gate for `p`: enabled for reuse or `includeNotEnabled`, and inside `scope.planIds` when that is set. */
function planVisible(scope: Scope): SQL {
  const gate = scope.includeNotEnabled === true ? sql`true` : sql`p.enabled_for_reuse`;
  if (scope.planIds === undefined) return gate;
  return scope.planIds.length ? sql`${gate} and p.id = any(${textArray(scope.planIds)})` : sql`false`;
}

/** The distinct blocks of plan `p`, from its rows whether or not each block is visible. */
const planBlocks = sql`(select pb.* from blocks pb where pb.id in (select ppb.block_id from practice_plan_blocks ppb where ppb.plan_id = p.id))`;

function planWhere(scope: Scope, f: PlanFilter): SQL {
  const parts: SQL[] = [planVisible(scope)];
  if (f.model !== undefined) parts.push(sql`p.model = ${f.model}`);
  if (f.promptVersion !== undefined) parts.push(sql`p.prompt_version = ${f.promptVersion}`);
  if (f.docsAgents !== undefined) parts.push(sql`p.docs_agents = ${f.docsAgents}`);
  if (f.docsTeaching !== undefined) parts.push(sql`p.docs_teaching = ${f.docsTeaching}`);
  if (f.areas?.length) parts.push(sql`(jsonb_typeof(p.answers -> 'areas') = 'array' and (p.answers -> 'areas') ?| ${textArray(f.areas)})`);
  if (f.levels?.length) parts.push(sql`exists (select 1 from ${planBlocks} x where x.level = any(${textArray(f.levels)}))`);
  if (f.topics?.length) parts.push(sql`not exists (select 1 from unnest(${textArray(f.topics)}) want(topic) where not exists (select 1 from ${planBlocks} x where x.topic = want.topic))`);
  return sql.join(parts, sql` and `);
}

interface PlanRow {
  id: string; title: string; answers: unknown; model: string; prompt_version: number | null; docs_agents: number | null; docs_teaching: number | null;
  reply: string; days: number; minutes: number; blocks: number; topics: Count[]; concepts: Count[]; review_count: number; review_mean: number | null;
  had_share: number | null;
}

/** Plans matching, with their counts from their block rows. */
function planQuery(scope: Scope, where: SQL, tail: SQL): SQL {
  const had = scope.player !== undefined
    ? sql`(select coalesce(count(*) filter (where ${owns(scope.player, sql`x.id`)})::float8 / nullif(count(*), 0), 0) from ${planBlocks} x)`
    : sql`null::float8`;
  return sql`
    select p.id, p.title, p.answers, p.model, p.prompt_version, p.docs_agents, p.docs_teaching, p.reply,
      (select count(distinct day)::int from practice_plan_blocks where plan_id = p.id) as days,
      (select coalesce(sum(minutes), 0)::int from practice_plan_blocks where plan_id = p.id) as minutes,
      (select count(*)::int from ${planBlocks} x) as blocks,
      (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'count', t.n) order by t.n desc, t.id collate "C"), '[]'::jsonb)
        from (select x.topic as id, count(*)::int as n from ${planBlocks} x where x.topic is not null group by x.topic) t) as topics,
      (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'count', c.n) order by c.n desc, c.id collate "C"), '[]'::jsonb)
        from (select cx.c as id, count(distinct x.id)::int as n from ${planBlocks} x cross join lateral unnest(x.concepts) cx(c) group by cx.c) c) as concepts,
      (select count(*)::int from plan_reviews pr where pr.library_plan_id = p.id) as review_count,
      (select avg(pr.stars)::float8 from plan_reviews pr where pr.library_plan_id = p.id) as review_mean,
      ${had} as had_share
    from practice_plans p
    where ${where}
    ${tail}`;
}

function planSummaryOf(r: PlanRow): PlanSummary {
  return {
    id: r.id, title: r.title, answers: r.answers,
    provenance: { model: r.model, promptVersion: r.prompt_version, docsAgents: r.docs_agents, docsTeaching: r.docs_teaching },
    days: r.days, minutes: r.minutes, blocks: r.blocks, topics: r.topics, concepts: r.concepts,
    reviews: { count: r.review_count, mean: r.review_mean },
    hadShare: r.had_share,
  };
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
      return r ? { ...summaryOf(scope, r), content: r.content, parentId: r.parent_id } : null;
    },
    async listPlans(scope, filter, limit) {
      const list = await rows<PlanRow>(planQuery(scope, planWhere(scope, filter), sql`order by p.id collate "C" ${limitOf(limit)}`));
      return list.map(planSummaryOf);
    },
    async getPlan(scope, id, withReply): Promise<PlanDetail | null> {
      const [r] = await rows<PlanRow>(planQuery(scope, sql`p.id = ${id} and ${planVisible(scope)}`, sql``));
      if (!r) return null;
      // a row's title only when its block is visible under the scope's block rule (as `getBlock`); its id and minutes always
      const schedule = await rows<{ day: number; place: number; blockId: string; title: string; minutes: number }>(sql`
        select ppb.day, ppb.place, ppb.block_id as "blockId", (case when ${blockVisible(scope, sql`ppb.block_id`)} and jsonb_typeof(b.content -> 'title') = 'string' then b.content ->> 'title' else '' end) as title, ppb.minutes
        from practice_plan_blocks ppb left join blocks b on b.id = ppb.block_id
        where ppb.plan_id = ${id}
        order by ppb.day, ppb.place`);
      return { ...planSummaryOf(r), schedule: schedule.map((s) => ({ ...s })), ...(withReply ? { reply: r.reply } : {}) };
    },
    async coverage(scope) {
      // visible blocks with their totals, and the visible plans (with `scope.planIds`) whose rows are matched against them
      const vb = sql`(select b.id, b.topic, b.level, b.concepts, b.steps, coalesce(u.times, 0) as times, coalesce(u.seconds, 0)::float8 as seconds
        from blocks b left join ${timeTotals()} u on u.block_id = b.id where ${blockVisible(scope, sql`b.id`)})`;
      const plansWith = (match: SQL) => sql`(select count(*)::int from practice_plans p where ${planVisible(scope)} and exists (
        select 1 from practice_plan_blocks ppb join blocks pb on pb.id = ppb.block_id where ppb.plan_id = p.id and ${match}))`;
      const topics = await rows<CoverageRow>(sql`
        select v.topic, v.level, count(*)::int as blocks, ${plansWith(sql`pb.topic = v.topic and pb.level = v.level`)} as plans,
          sum(v.times)::int as times, sum(v.seconds)::float8 as seconds
        from ${vb} v
        where v.topic is not null and v.level is not null
        group by v.topic, v.level
        order by v.topic collate "C", v.level collate "C"`);
      const concepts = await rows<ConceptCoverage>(sql`
        select vc.concept, count(*)::int as blocks, ${plansWith(sql`vc.concept = any(pb.concepts)`)} as plans,
          sum(vc.times)::int as times, sum(vc.seconds)::float8 as seconds
        from (select distinct v.id, c.concept, v.times, v.seconds from ${vb} v cross join lateral unnest(v.concepts) c(concept)) vc
        group by vc.concept
        order by vc.concept collate "C"`);
      const steps = await rows<StepCoverage>(sql`
        select vs.step, count(*)::int as blocks, ${plansWith(sql`vs.step = any(pb.steps)`)} as plans,
          sum(vs.times)::int as times, sum(vs.seconds)::float8 as seconds
        from (select distinct v.id, s.step, v.times, v.seconds from ${vb} v cross join lateral unnest(v.steps) s(step)) vs
        group by vs.step
        order by vs.step collate "C"`);
      return { topics: topics.map((t) => ({ ...t })), concepts: concepts.map((c) => ({ ...c })), steps: steps.map((s) => ({ ...s })) };
    },
    async userExists(id) {
      const found = await rows<{ one: number }>(sql`select 1 as one from users where id::text = ${id} limit 1`);
      return found.length > 0;
    },
  };
}
