import type { Stars } from "@/features/progress/stars";
import type { LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type {
  BlockDetail, BlockFilter, BlockOrder, BlockSummary, BlockUse, ConceptCoverage, Count, CoverageRow, PlanDetail, PlanFilter, PlanSummary, PlayerBlock, Scope, StepCoverage,
} from "./types";

type Row = LibraryData["blocks"][number];

const isMap = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The library over plain rows: the readable statement of the rules the Postgres implementation must keep. */
export function memoryLibraryRepo(data: LibraryData): LibraryRepo {
  /** A block is visible when an owner row is enabled, or the player owns it, or the app owns it and the scope includes the not enabled. */
  const visible = (scope: Scope, b: Row): boolean =>
    data.owners.some((o) =>
      o.blockId === b.id &&
      (o.enabledForReuse || (scope.player !== undefined && o.userId === scope.player) || (o.userId === null && scope.includeNotEnabled === true)));

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

  /** The player's latest rating of the block: latest `at` (bytewise), an entry without one last, then the lowest exercise id. */
  const latest = (id: string, player: string): { stars: Stars; at: string | null } | null => {
    const rows = ratings(id, player).sort((a, b) => {
      const x = atOf(a), y = atOf(b);
      if (x !== y) return x === null ? 1 : y === null ? -1 : cmp(y, x);
      return cmp(a.exerciseId, b.exerciseId);
    });
    return rows[0] ? { stars: rows[0].entry.stars, at: atOf(rows[0]) } : null;
  };

  const mine = (id: string, player: string): PlayerBlock => {
    const l = latest(id, player), t = timed(id, player);
    return { stars: l?.stars ?? null, ratedAt: l?.at ?? null, times: t.length, seconds: sum(t) };
  };

  /** The block's title, or "" when its content has none. */
  const titleOf = (b: Row): string => (typeof b.content.title === "string" ? b.content.title : "");

  /** A schedule row's title: the block's when the block is visible in the scope, else "" (the row's id and minutes stay). */
  const blockTitle = (scope: Scope, id: string): string => {
    const b = data.blocks.find((x) => x.id === id);
    return b && visible(scope, b) ? titleOf(b) : "";
  };

  const summary = (scope: Scope, b: Row): BlockSummary => ({
    id: b.id, title: titleOf(b), area: b.area, topic: b.topic, concepts: [...b.concepts], level: b.level, steps: [...b.steps], tags: [...b.tags],
    provenance: { model: b.model, promptVersion: b.promptVersion, docsAgents: b.docsAgents, docsTeaching: b.docsTeaching },
    use: totals(b.id),
    ...(scope.player !== undefined ? { mine: mine(b.id, scope.player) } : {}),
  });

  const matches = (scope: Scope, f: BlockFilter, b: Row): boolean => {
    if (f.area !== undefined && b.area !== f.area) return false;
    if (f.topic !== undefined && b.topic !== f.topic) return false;
    if (f.level !== undefined && b.level !== f.level) return false;
    if (f.model !== undefined && b.model !== f.model) return false;
    if (f.promptVersion !== undefined && b.promptVersion !== f.promptVersion) return false;
    if (f.docsAgents !== undefined && b.docsAgents !== f.docsAgents) return false;
    if (f.docsTeaching !== undefined && b.docsTeaching !== f.docsTeaching) return false;
    if (f.concepts?.length && !f.concepts.some((c) => b.concepts.includes(c))) return false;
    if (f.steps?.length && !f.steps.some((s) => b.steps.includes(s))) return false;
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
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

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
    const stars = data.reviews.filter((r) => r.libraryPlanId === p.id).map((r) => r.stars);
    return {
      id: p.id, title: p.title, answers: p.answers,
      provenance: { model: p.model, promptVersion: p.promptVersion, docsAgents: p.docsAgents, docsTeaching: p.docsTeaching },
      days: new Set(rows.map((r) => r.day)).size,
      minutes: sum(rows.map((r) => r.minutes)),
      blocks: blocks.length,
      topics: counts(blocks.flatMap((b) => (b.topic !== null ? [b.topic] : []))),
      concepts: counts(blocks.flatMap((b) => [...new Set(b.concepts)])),
      reviews: { count: stars.length, mean: stars.length ? sum(stars) / stars.length : null },
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
    if (f.levels?.length && !blocks.some((b) => b.level !== null && f.levels!.includes(b.level))) return false;
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
      return { ...summary(scope, b), content: b.content, parentId: b.parentId };
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
      const plans = data.plans.filter((p) => planVisible(scope, p)).map((p) => planBlockRows(p.id));
      const rows = (match: (b: Row) => boolean) => {
        const own = blocks.filter(match);
        const t = own.map((b) => totals(b.id));
        return {
          blocks: own.length, plans: plans.filter((pb) => pb.some(match)).length,
          times: sum(t.map((u) => u.times)), seconds: sum(t.map((u) => u.seconds)),
        };
      };
      const pairs = new Map<string, { topic: string; level: string }>();
      for (const b of blocks) if (b.topic !== null && b.level !== null) pairs.set(`${b.topic}\u0000${b.level}`, { topic: b.topic, level: b.level });
      const topics: CoverageRow[] = [...pairs.values()]
        .sort((a, b) => (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : a.level < b.level ? -1 : a.level > b.level ? 1 : 0))
        .map(({ topic, level }) => ({ topic, level, ...rows((b) => b.topic === topic && b.level === level) }));
      const concepts: ConceptCoverage[] = [...new Set(blocks.flatMap((b) => b.concepts))].sort()
        .map((concept) => ({ concept, ...rows((b) => b.concepts.includes(concept)) }));
      const steps: StepCoverage[] = [...new Set(blocks.flatMap((b) => b.steps))].sort()
        .map((step) => ({ step, ...rows((b) => b.steps.includes(step)) }));
      return { topics, concepts, steps };
    },
    async userExists(id) {
      return data.users.some((u) => u.id === id);
    },
  };
}
