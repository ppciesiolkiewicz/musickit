export const SELF = "You can't remove your own admin permission.";
export const FAILED = "Couldn't save the permissions. Try again.";

/** What the permission boxes say when a save fails: `error` is the route's `error` (undefined when none came back). */
export const failedMessage = (error: string | undefined): string => (error === "self" ? SELF : FAILED);

/** What to show for anything a save threw: the own-admin refusal by name, every other error (a network failure, a timeout) as the plain failure. */
export const thrownMessage = (e: unknown): string => failedMessage(e instanceof Error && e.message === SELF ? "self" : undefined);

export const LOAD_FAILED = "Couldn't load what would be deleted. Try again.";
export const DELETE_FAILED = "Couldn't delete the account. Try again.";
export const DELETE_SELF = "You can't delete your own account here. Use Delete account on the Account page.";
export const DELETE_MISSING = "This account is already gone. Reload the page.";

/** What the delete question says when the route refuses: `error` is the route's `error`, `fallback` the plain failure. */
export const deleteMessage = (error: string | undefined, fallback: string): string => (error === "self" ? DELETE_SELF : error === "missing" ? DELETE_MISSING : fallback);
