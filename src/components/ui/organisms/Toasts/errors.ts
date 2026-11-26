/** The last-resort words for a failure nothing closer to it put into words. */
export const GENERIC_ERROR = "Something went wrong. Try again, or reload the page.";

/**
 * A failure with words for the player, thrown by the code that knows what went wrong ("This account is already
 * gone. Reload the page."). Whatever catches it shows its message as is.
 */
export class ShownError extends Error {
  override name = "ShownError";
}

/**
 * The words for a failure, most specific first: a `ShownError`'s own message, else `fallback` (what the caller was
 * doing: "Couldn't save the reminder. Try again."), else `GENERIC_ERROR`.
 */
export function errorText(e: unknown, fallback?: string): string {
  if (e instanceof ShownError && e.message) return e.message;
  return fallback || GENERIC_ERROR;
}

/** An abort (a request cancelled by leaving the page) is not a failure to report; a timeout is. */
export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === "AbortError";

/** Browser noise that is not a failure: ResizeObserver's loop notice, and errors from other sites' scripts. */
export function isNoise(message: string, filename: string | undefined, origin: string): boolean {
  if (/ResizeObserver loop/.test(message)) return true;
  return !!filename && !filename.startsWith(origin);
}
