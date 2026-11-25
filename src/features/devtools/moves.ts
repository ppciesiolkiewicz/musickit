/**
 * Pages that moved. Plain data with no imports, so next.config.ts can read it by relative path for its redirects and the
 * app can use `movedPath` for links it holds as text.
 */
export const MOVES: readonly { from: string; to: string }[] = [
  { from: "/admin/messages", to: "/admin/admin/messages" },
  { from: "/admin/users", to: "/admin/admin/users" },
  { from: "/admin/invites", to: "/admin/admin/invites" },
  { from: "/dev/messages", to: "/admin/admin/messages" },
];

/** A route (a path with an optional `#hash`) with its path moved when it is a moved page or under one; anything else as it was. */
export function movedPath(route: string): string {
  const cut = route.search(/[#?]/);
  const path = cut < 0 ? route : route.slice(0, cut);
  const rest = cut < 0 ? "" : route.slice(cut);
  for (const { from, to } of MOVES) {
    if (path === from) return to + rest;
    if (path.startsWith(`${from}/`)) return to + path.slice(from.length) + rest;
  }
  return route;
}
