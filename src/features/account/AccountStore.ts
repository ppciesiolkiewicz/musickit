import type { Account } from "./model";

/**
 * Who is signed in, and signing out. The UI only talks to this, so where accounts live never reaches a page.
 */
export interface AccountStore {
  /** The signed-in account, or null when nobody is. */
  current(): Promise<Account | null>;
  signOut(): Promise<void>;
}
