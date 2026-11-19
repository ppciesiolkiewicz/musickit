import type { Block } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import type { LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type {
  BlockChoice, BlockDetail, BlockFilter, BlockSlot, BlockOrder, BlockSummary, BlockUse, ComposeBlock, ConceptCoverage, Count, CoverageRow, PlanDetail, PlanFilter, PlanSummary, PlayerBlock, Scope, StepCoverage,
} from "./types";

type Row = LibraryData["blocks"][number];
type Choice = LibraryData["choices"][number];

/** What a block serves: a hashed block its own level and steps, a curated block each of its listed choices. */
interface Unit { level: string | null; steps: string[] }

const isMap = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The library over plain rows: the readable statement of the rules the Postgres implementation must keep. */
export function memoryLibraryRepo(data: LibraryData): LibraryRepo {
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  /** A curated block's choices by place: the active ones, or all with `includeNotEnabled`. */
  const listed = (scope: Scope, id: string): Choice[] =>
    data.choices.filter((c) => c.blockId === id && (c.active || scope.includeNotEnabled === true)).sort((a, b) => a.place - b.place || byId(a, b));

  /**
   * A block is visible when the player owns it; a curated block also when it has an active choice (any block of the app's with
   * `includeNotEnabled`); a hashed block only to its owners, and with `includeNotEnabled` when the app owns it.
   */
  const visible = (scope: Scope, b: Row): boolean => {
    if (scope.player !== undefined && data.owners.some((o) => o.blockId === b.id && o.userId === scope.player)) return true;
    if (b.kind === "curated") return scope.includeNotEnabled === true || data.choices.some((c) => c.blockId === b.id && c.active);
    return scope.includeNotEnabled === true && data.owners.some((o) => o.blockId === b.id && o.userId === null);
  };

  const units = (scope: Scope, b: Row): Unit[] => (b.kind === "curated" ? listed(scope, b.id) : [b]);

  /** A plan row's level and steps: its choice's when it names one, else its block's. */
  const rowUnit = (r: LibraryData["planBlocks"][number]): Unit | null => {
    const c = r.choiceId ? data.choices.find((x) => x.id === r.choiceId) : undefined;
    if (c) return c;
    return data.blocks.find((b) => b.id === r.blockId) ?? null;
  };

  const had = (player: string, id: string) => data.owners.some((o) => o.userId === player && o.blockId === id);

  /** The (day row, seconds) pairs where the timer counted seconds on the block; a row with no `blocks` map or a non-number is skipped. */
  const timed = (id: string, player?: string): number[] =>
    data.dayTimes.flatMap((t) => {
      if (player !== undefined && t.userId !== player) return [];
      if (!isMap(t.blocks) || !isMap(t.spent)) return [];
      const blocks = t.blocks, spent = t.spent;
      const seconds = Object.keys(blocks).reduce((sum, slot) => {
        const s = spent[slot];
        return blocks[slot] === id && typeof s === "number" && Number.isFinite(s) && s > 0 ? sum + s : sum;
      }, 0);
      return seconds > 0 ? [seconds] : [];
    });

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const ratings = (id: string, player?: string) => data.progress.filter((p) => p.blockId === id && (player === undefined || p.userId === player));
  const choiceRatings = (choiceId: string, player: string) => data.progress.filter((p) => p.choiceId === choiceId && p.userId === player);

  const totals = (id: string): BlockUse => {
    const rows = ratings(id);
    const stars: BlockUse["stars"] = [0, 0, 0, 0, 0];
    for (const r of rows) stars[r.entry.stars - 1]++;
    const t = timed(id);
    return { times: t.length, seconds: sum(t), rated: rows.length, stars };
  };

  /** An entry's `at` when it is a string, else null. */
  const atOf = (r: LibraryData["progress"][number]): string | null => (typeof r.entry.at === "string" ? r.entry.at : null);
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

  /** The latest of these ratings: latest `at` (bytewise), an entry without one last, then the lowest exercise id. */
  const newest = (list: LibraryData["progress"]): { stars: Stars; at: string | null } | null => {
    const rows = [...list].sort((a, b) => {
      const x = atOf(a), y = atOf(b);
      if (x !== y) return x === null ? 1 : y === null ? -1 : cmp(y, x);
      return cmp(a.exerciseId, b.exerciseId);
    });
    return rows[0] ? { stars: rows[0].entry.stars, at: atOf(rows[0]) } : null;
  };
  /** The player's latest rating of the block (any of its choices, or none). */
  const latest = (id: string, player: string) => newest(ratings(id, player));

  const mine = (id: string, player: string): PlayerBlock => {
    const l = latest(id, player), t = timed(id, player);
    return { stars: l?.stars ?? null, ratedAt: l?.at ?? null, times: t.length, seconds: sum(t) };
  };

  /** The slot a block was stored with, or null when it has no minutes. */
  const slotOf = (b: Row): BlockSlot | null =>
    b.minutes === null
      ? null
      : { minutes: b.minutes, ...(b.why ? { why: b.why } : {}), ...(b.learnBefore?.length ? { learnBefore: [...b.learnBefore] } : {}), ...(b.exploreMore?.length ? { exploreMore: [...b.exploreMore] } : {}) };

  /** The block's title, or "" when its content has none. */
  const titleOf = (b: Row): string => (typeof b.content.title === "string" ? b.content.title : "");

  /** A schedule row's title: the block's when the block is visible in the scope, else "" (the row's id and minutes stay). */
  const blockTitle = (scope: Scope, id: string): string => {
    const b = data.blocks.find((x) => x.id === id);
    return b && visible(scope, b) ? titleOf(b) : "";
  };

  const choicesOf = (scope: Scope, b: Row): BlockChoice[] =>
    b.kind === "curated" ? listed(scope, b.id).map((c) => ({ id: c.id, name: c.name, level: c.level, steps: [...c.steps], moves: c.moves ?? null, minutes: c.minutes, active: c.active })) : [];

  const summary = (scope: Scope, b: Row): BlockSummary => {
    const choices = choicesOf(scope, b);
    const curated = b.kind === "curated";
    return {
    id: b.id, title: titleOf(b), area: b.area, topic: b.topic, concepts: [...b.concepts],
    level: curated ? (choices[0]?.level ?? null) : b.level,
    steps: curated ? [...new Set(choices.flatMap((c) => c.steps))] : [...b.steps],
    choices, tags: [...b.tags],
    provenance: { model: b.model, promptVersion: b.promptVersion, docsAgents: b.docsAgents, docsTeaching: b.docsTeaching },
    use: totals(b.id),
    ...(scope.player !== undefined ? { mine: mine(b.id, scope.player) } : {}),
    };
  };

  const matches = (scope: Scope, f: BlockFilter, b: Row): boolean => {
    if (f.area !== undefined && b.area !== f.area) return false;
    if (f.topic !== undefined && b.topic !== f.topic) return false;
    if (f.level !== undefined && !units(scope, b).some((u) => u.level === f.level)) return false;
    if (f.model !== undefined && b.model !== f.model) return false;
    if (f.promptVersion !== undefined && b.promptVersion !== f.promptVersion) return false;
    if (f.docsAgents !== undefined && b.docsAgents !== f.docsAgents) return false;
    if (f.docsTeaching !== undefined && b.docsTeaching !== f.docsTeaching) return false;
    if (f.concepts?.length && !f.concepts.some((c) => b.concepts.includes(c))) return false;
    if (f.steps?.length && !units(scope, b).some((u) => f.steps!.some((s) => u.steps.includes(s)))) return false;
    if (f.tags?.length && !f.tags.every((t) => b.tags.includes(t))) return false;
    if (f.player !== undefined) {
      if (scope.player === undefined) return false;
      const own = had(scope.player, b.id);
      if (f.player === "unused") return !own;
      if (!own) return false;
      if (f.player === "repeat") {
        const l = latest(b.id, scope.player);
        return l !== null && l.stars <= 3;
      }
    }
    return true;
  };

  const found = (scope: Scope, f: BlockFilter) => data.blocks.filter((b) => visible(scope, b) && matches(scope, f, b));

  type Plan = LibraryData["plans"][number];

  /** A plan is visible when enabled for reuse or the scope includes the not enabled, and inside `scope.planIds` when that is set. */
  const planVisible = (scope: Scope, p: Plan): boolean =>
    (p.enabledForReuse || scope.includeNotEnabled === true) && (scope.planIds === undefined || scope.planIds.includes(p.id));

  /** The plan's distinct blocks, from its rows whether or not each block is visible to the caller. */
  const planBlockRows = (planId: string): Row[] => {
    const ids = new Set(data.planBlocks.filter((r) => r.planId === planId).map((r) => r.blockId));
    return data.blocks.filter((b) => ids.has(b.id));
  };

  const counts = (values: string[]): Count[] => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || byId(a, b));
  };

  const planSummary = (scope: Scope, p: Plan): PlanSummary => {
    const player = scope.player;
    const rows = data.planBlocks.filter((r) => r.planId === p.id);
    const blocks = planBlockRows(p.id);
    return {
      id: p.id, title: p.title, answers: p.answers,
      provenance: { model: p.model, promptVersion: p.promptVersion, docsAgents: p.docsAgents, docsTeaching: p.docsTeaching },
      days: new Set(rows.map((r) => r.day)).size,
      minutes: sum(rows.map((r) => r.minutes)),
      blocks: blocks.length,
      topics: counts(blocks.flatMap((b) => (b.topic !== null ? [b.topic] : []))),
      concepts: counts(blocks.flatMap((b) => [...new Set(b.concepts)])),
      hadShare: player === undefined ? null : blocks.length ? blocks.filter((b) => had(player, b.id)).length / blocks.length : 0,
    };
  };

  const planMatches = (f: PlanFilter, p: Plan): boolean => {
    if (f.model !== undefined && p.model !== f.model) return false;
    if (f.promptVersion !== undefined && p.promptVersion !== f.promptVersion) return false;
    if (f.docsAgents !== undefined && p.docsAgents !== f.docsAgents) return false;
    if (f.docsTeaching !== undefined && p.docsTeaching !== f.docsTeaching) return false;
    if (f.areas?.length) {
      const areas = isMap(p.answers) && Array.isArray(p.answers.areas) ? p.answers.areas : [];
      if (!f.areas.some((a) => areas.includes(a))) return false;
    }
    const blocks = planBlockRows(p.id);
    const rows = data.planBlocks.filter((r) => r.planId === p.id).map(rowUnit);
    if (f.levels?.length && !rows.some((u) => u !== null && u.level !== null && f.levels!.includes(u.level))) return false;
    if (f.topics?.length && !f.topics.every((t) => blocks.some((b) => b.topic === t))) return false;
    return true;
  };

  return {
    async countBlocks(scope, filter) {
      return found(scope, filter).length;
    },
    async listBlocks(scope, filter, order: BlockOrder, limit) {
      const list = found(scope, filter).map((b) => ({ b, s: summary(scope, b) }));
      list.sort(order === "newest"
        ? (x, y) => y.b.createdAt.getTime() - x.b.createdAt.getTime() || byId(x.b, y.b)
        : (x, y) => x.s.use.seconds - y.s.use.seconds || x.s.use.times - y.s.use.times || byId(x.b, y.b));
      return list.slice(0, Math.max(0, limit)).map((x) => x.s);
    },
    async getBlock(scope, id): Promise<BlockDetail | null> {
      const b = data.blocks.find((x) => x.id === id);
      if (!b || !visible(scope, b)) return null;
      return { ...summary(scope, b), content: b.content, parentId: b.parentId, slot: slotOf(b) };
    },
    async listPlans(scope, filter, limit) {
      return data.plans.filter((p) => planVisible(scope, p) && planMatches(filter, p)).sort(byId)
        .slice(0, Math.max(0, limit)).map((p) => planSummary(scope, p));
    },
    async getPlan(scope, id, withReply): Promise<PlanDetail | null> {
      const p = data.plans.find((x) => x.id === id);
      if (!p || !planVisible(scope, p)) return null;
      const schedule = data.planBlocks.filter((r) => r.planId === id).sort((a, b) => a.day - b.day || a.place - b.place)
        .map((r) => ({ day: r.day, place: r.place, blockId: r.blockId, title: blockTitle(scope, r.blockId), minutes: r.minutes }));
      return { ...planSummary(scope, p), schedule, ...(withReply ? { reply: p.reply } : {}) };
    },
    async coverage(scope) {
      const blocks = data.blocks.filter((b) => visible(scope, b));
      // every unit of a visible block: a hashed block once, a curated block once per listed choice
      const all = blocks.flatMap((b) => units(scope, b).map((u) => ({ b, u })));
      // the visible plans, each as its rows' (block, level and steps)
      const plans = data.plans.filter((p) => planVisible(scope, p))
        .map((p) => data.planBlocks.filter((r) => r.planId === p.id).flatMap((r) => {
          const b = data.blocks.find((x) => x.id === r.blockId), u = rowUnit(r);
          return b && u ? [{ b, u }] : [];
        }));
      type Pair = { b: Row; u: Unit };
      const rows = (match: (x: Pair) => boolean) => {
        const own = all.filter(match);
        // a block's time once, however many of its choices match
        const t = [...new Set(own.map((x) => x.b.id))].map((id) => totals(id));
        return {
          blocks: own.length, plans: plans.filter((pb) => pb.some(match)).length,
          times: sum(t.map((u) => u.times)), seconds: sum(t.map((u) => u.seconds)),
        };
      };
      const pairs = new Map<string, { topic: string; level: string }>();
      for (const { b, u } of all) if (b.topic !== null && u.level !== null) pairs.set(`${b.topic}\u0000${u.level}`, { topic: b.topic, level: u.level });
      const topics: CoverageRow[] = [...pairs.values()]
        .sort((a, b) => (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : a.level < b.level ? -1 : a.level > b.level ? 1 : 0))
        .map(({ topic, level }) => ({ topic, level, ...rows((x) => x.b.topic === topic && x.u.level === level) }));
      // concepts are the block's: a block counts once
      const conceptRows = (concept: string) => {
        const own = blocks.filter((b) => b.concepts.includes(concept));
        const t = own.map((b) => totals(b.id));
        return {
          blocks: own.length, plans: plans.filter((pb) => pb.some((x) => x.b.concepts.includes(concept))).length,
          times: sum(t.map((u) => u.times)), seconds: sum(t.map((u) => u.seconds)),
        };
      };
      const concepts: ConceptCoverage[] = [...new Set(blocks.flatMap((b) => b.concepts))].sort()
        .map((concept) => ({ concept, ...conceptRows(concept) }));
      const steps: StepCoverage[] = [...new Set(all.flatMap((x) => x.u.steps))].sort()
        .map((step) => ({ step, ...rows((x) => x.u.steps.includes(step)) }));
      return { topics, concepts, steps };
    },
    async composeBlocks(player, areas): Promise<ComposeBlock[]> {
      const list: ComposeBlock[] = [];
      for (const b of [...data.blocks].sort(byId)) {
        if (b.kind !== "curated" || b.area === null || !areas.includes(b.area)) continue;
        const t = timed(b.id);
        for (const c of listed({}, b.id)) {
          if (c.steps.length === 0) continue;
          const l = newest(choiceRatings(c.id, player));
          // the block's content carries the choice's moves (a curated block's content has none of its own)
          const content: Block = { ...b.content };
          delete content.moves;
          if (c.moves) content.moves = c.moves;
          list.push({
            id: b.id, choiceId: c.id, content,
            area: b.area, topic: b.topic, concepts: [...b.concepts], steps: [...c.steps], level: c.level, tags: [...b.tags],
            slot: slotOf({ ...b, minutes: c.minutes })!,
            use: { times: t.length, seconds: sum(t) }, mine: l ? { stars: l.stars, ratedAt: l.at ?? "" } : null,
          });
        }
      }
      return list;
    },
    async userExists(id) {
      return data.users.some((u) => u.id === id);
    },
  };
}
