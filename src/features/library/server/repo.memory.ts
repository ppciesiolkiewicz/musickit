import type { Stars } from "@/features/progress/stars";
import type { LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type { BlockDetail, BlockFilter, BlockOrder, BlockSummary, BlockUse, PlayerBlock, Scope } from "./types";

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

  const latest = (id: string, player: string): { stars: Stars; at: string } | null => {
    const rows = ratings(id, player).sort((a, b) => (a.entry.at < b.entry.at ? 1 : a.entry.at > b.entry.at ? -1 : 0));
    return rows[0] ? { stars: rows[0].entry.stars, at: rows[0].entry.at } : null;
  };

  const mine = (id: string, player: string): PlayerBlock => {
    const l = latest(id, player), t = timed(id, player);
    return { stars: l?.stars ?? null, ratedAt: l?.at ?? null, times: t.length, seconds: sum(t) };
  };

  const summary = (scope: Scope, b: Row): BlockSummary => ({
    id: b.id, title: b.content.title, area: b.area, topic: b.topic, concepts: [...b.concepts], level: b.level, tags: [...b.tags],
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
    async userExists(id) {
      return data.users.some((u) => u.id === id);
    },
  };
}
