/** Where the chat bubble shows, and what a message says it is about from the URL alone. */

/**
 * Pages where the bubble would cover a tool's own controls, or has no place: the looper and the tuner fill the screen
 * with controls; /feedback is the same form; /dev and /admin pages are ours.
 */
const HIDE = ["/looper", "/tuner", "/feedback", "/dev", "/admin"];

export const bubblePlacement = (pathname: string): "show" | "hide" =>
  HIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "hide" : "show";

/**
 * The course section a message is about, from the path and its #hash. The plan and practice pages don't name the
 * exercise in the URL, so their messages carry the headings above it instead (`under`).
 * TODO(ref): name the plan day and exercise once those pages put them in the URL or a context.
 */
export function refOf(pathname: string, hash: string): string | undefined {
  const m = /^\/course\/(.+)$/.exec(pathname);
  return m ? `course/${m[1]}${hash}` : undefined;
}
