import type { Block } from "@/features/plan/model/types";
import { applyChoiceSet, isEmptyChoiceSet, readChoiceSet } from "@/features/plan/model/choiceSet";
import type { Stars } from "@/features/progress/stars";
import type { LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type {
  BlockChoice, BlockDetail, BlockFilter, BlockSlot, BlockOrder, BlockSummary, BlockUse, ComposeBlock, ConceptCoverage, CoverageRow, PlayerBlock, Scope, StepCoverage,
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

  const choicesOf = (scope: Scope, b: Row): BlockChoice[] =>
    b.kind === "curated" ? listed(scope, b.id).map((c) => ({ id: c.id, name: c.name, level: c.level, steps: [...c.steps], moves: c.moves ?? null, minutes: c.minutes, active: c.active, ...(isEmptyChoiceSet(readChoiceSet(c.set)) ? {} : { set: readChoiceSet(c.set) }) })) : [];

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
    async coverage(scope) {
      const blocks = data.blocks.filter((b) => visible(scope, b));
      // every unit of a visible block: a hashed block once, a curated block once per listed choice
      const all = blocks.flatMap((b) => units(scope, b).map((u) => ({ b, u })));
      type Pair = { b: Row; u: Unit };
      const rows = (match: (x: Pair) => boolean) => {
        const own = all.filter(match);
        // a block's time once, however many of its choices match
        const t = [...new Set(own.map((x) => x.b.id))].map((id) => totals(id));
        return {
          blocks: own.length,
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
          blocks: own.length,
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
          if (c.steps.length === 0 && b.content.kind !== "warm-up") continue;
          const l = newest(choiceRatings(c.id, player));
          // the block's content as the choice draws it (its set) and with the choice's moves (a curated block's content has none of its own)
          const content: Block = applyChoiceSet({ ...b.content }, readChoiceSet(c.set));
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
