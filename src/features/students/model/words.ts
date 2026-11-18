import { ACCOUNT_CHANGED_WORDS } from "@/features/account/serverAccountStore";

/**
 * The lines for the sign-in answers, in one place: the routes send them (`server/http.ts`) and the page shows them for the
 * same codes when the route sent none (`client.ts`, `CLIENT_WORDS`). The page knows each answer by its `code`.
 */

export { ACCOUNT_CHANGED_WORDS };

/** A 401: the session ended. Reloading takes them to log in. */
export const LOGGED_OUT_WORDS = "You're logged out. Reload the page and log in again.";
