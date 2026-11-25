/**
 * What /admin/content/library reads from the address: a topic to list blocks for, a player, and the plan or block id to draw.
 */
export interface LibraryParams {
  topic?: string;
  player?: string;
  item?: string;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === "" ? undefined : s;
};

export function readParams(raw: Raw): LibraryParams {
  return { topic: first(raw.topic), player: first(raw.player), item: first(raw.item) };
}

/** The arguments `devScope` takes: the page always reads everything, inactive choices and the app's old blocks too. */
export function devArgs(p: LibraryParams): { player?: string; include_not_enabled?: boolean } {
  const a: { player?: string; include_not_enabled?: boolean } = { include_not_enabled: true };
  if (p.player !== undefined) a.player = p.player;
  return a;
}

/** A link to this page with the parameters of `p`, changed by `patch` (`undefined` or `false` removes one). */
export function libraryHref(p: LibraryParams, patch: Partial<LibraryParams> = {}): string {
  const m = { ...p, ...patch };
  const q = new URLSearchParams();
  if (m.topic !== undefined) q.set("topic", m.topic);
  if (m.player !== undefined) q.set("player", m.player);
  if (m.item !== undefined) q.set("item", m.item);
  const s = q.toString();
  return s ? `/admin/content/library?${s}` : "/admin/content/library";
}

/** Seconds as minutes to one decimal. */
export const minutes = (seconds: number): string => (Math.round(seconds / 6) / 10).toString();

/** A model or version that is not known shows as a dash. */
export const orDash = (v: string | number | null): string => (v === null ? "–" : String(v));
