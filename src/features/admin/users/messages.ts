export const SELF = "You can't remove your own admin permission.";
export const FAILED = "Couldn't save the permissions. Try again.";

/** What the permission boxes say when a save fails: `error` is the route's `error` (undefined when none came back). */
export const failedMessage = (error: string | undefined): string => (error === "self" ? SELF : FAILED);

/** What to show for anything a save threw: the own-admin refusal by name, every other error (a network failure, a timeout) as the plain failure. */
export const thrownMessage = (e: unknown): string => failedMessage(e instanceof Error && e.message === SELF ? "self" : undefined);
