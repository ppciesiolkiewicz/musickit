/*
 * The app's three places, as the top nav links to them. One list for the nav (src/components/SiteNav.tsx), the login
 * page, which says which of them a visitor was on their way to, and the account guard, which keeps an account with no
 * plan out of them until it has chosen one (features/account/ui/LoginGuard).
 */

export type AppPlace = { href: string; label: string; /** the paths that count as being there */ under: string[] };

export const APP_PLACES: AppPlace[] = [
  { href: "/plan", label: "AI autoplan", under: ["/plan"] },
  { href: "/teachers/studio?notes=1", label: "Interactive notes", under: ["/teachers/studio", "/note", "/creator"] },
  { href: "/practice", label: "Practice", under: ["/practice", "/theory", "/course", "/tuner", "/looper", "/cheatsheet"] },
];

/** Whether a path (its query and hash ignored) is one of `paths` or under one ("/note" covers "/note/x", not "/notes"). */
export const isUnder = (pathAndQuery: string, paths: string[]): boolean => {
  const path = pathAndQuery.split(/[?#]/)[0];
  return paths.some((p) => path === p || path.startsWith(`${p}/`));
};

/** The place a path belongs to, or null for a page outside the three. */
export const placeFor = (pathAndQuery: string): AppPlace | null => APP_PLACES.find((p) => isUnder(pathAndQuery, p.under)) ?? null;
