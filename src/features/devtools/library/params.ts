import { SEED_PLANS } from "@/features/library/seed";

/**
 * What the /admin/content/library pages read from the address: a topic to list blocks for, a player, and the plan or
 * block id to open.
 */
export interface LibraryParams {
  topic?: string;
  player?: string;
  item?: string;
  /** TEMPORARY: a near-copy group to list (`nearCopies.ts`), in place of a topic */
  group?: string;
}

/** The library's subpages: the coverage overview, the seed plans, the blocks of a topic. */
export type LibraryTab = "overview" | "plans" | "blocks";

export const LIBRARY_PATH = "/admin/content/library";
export const TAB_PATH: Record<LibraryTab, string> = {
  overview: LIBRARY_PATH,
  plans: `${LIBRARY_PATH}/plans`,
  blocks: `${LIBRARY_PATH}/blocks`,
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === "" ? undefined : s;
};

export function readParams(raw: Raw): LibraryParams {
  return { topic: first(raw.topic), player: first(raw.player), item: first(raw.item), group: first(raw.group) };
}

/** Naming a player shows that player's private blocks, ratings and play times: only `dev` and `admin` may (not `content` alone). */
export const canNamePlayer = (open: readonly string[]): boolean => open.includes("dev") || open.includes("admin");

/** The parameters this viewer may use: `player` is dropped unless they may name one. */
export function allowedParams(p: LibraryParams, open: readonly string[]): LibraryParams {
  return canNamePlayer(open) ? p : { ...p, player: undefined };
}

/** The arguments `devScope` takes: the page always reads everything, inactive choices and the app's old blocks too. */
export function devArgs(p: LibraryParams): { player?: string; include_not_enabled?: boolean } {
  const a: { player?: string; include_not_enabled?: boolean } = { include_not_enabled: true };
  if (p.player !== undefined) a.player = p.player;
  return a;
}

/**
 * A link to a library subpage with the parameters of `p`, changed by `patch` (`undefined` removes one). The overview and
 * the plans page take no topic; the overview opens no item.
 */
export function libraryHref(tab: LibraryTab, p: LibraryParams, patch: Partial<LibraryParams> = {}): string {
  const m = { ...p, ...patch };
  const q = new URLSearchParams();
  if (tab === "blocks" && m.topic !== undefined) q.set("topic", m.topic);
  if (tab === "blocks" && m.group !== undefined) q.set("group", m.group);
  if (m.player !== undefined) q.set("player", m.player);
  if (tab !== "overview" && m.item !== undefined) q.set("item", m.item);
  const s = q.toString();
  return s ? `${TAB_PATH[tab]}?${s}` : TAB_PATH[tab];
}

/** The subpage an item opens on: a seed plan's id on Plans, anything else (a block or a choice) on Blocks. */
export const tabOfItem = (id: string): LibraryTab => (SEED_PLANS.some((p) => p.id === id) ? "plans" : "blocks");

/**
 * Where an older `/admin/content/library?item=<id>…` link (a seed file, a section note, a chat) goes now: the item's
 * subpage with the same query (a note's `note=` too), or null when the address names no item.
 */
export function itemRedirect(raw: Raw): string | null {
  const item = first(raw.item);
  if (item === undefined) return null;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const s of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, s);
  return `${TAB_PATH[tabOfItem(item)]}?${q.toString()}`;
}

/** Seconds as minutes to one decimal. */
export const minutes = (seconds: number): string => (Math.round(seconds / 6) / 10).toString();

/** A model or version that is not known shows as a dash. */
export const orDash = (v: string | number | null): string => (v === null ? "–" : String(v));
