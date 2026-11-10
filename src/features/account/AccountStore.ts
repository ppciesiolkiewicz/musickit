import type { Account, AccountInput, AccountResult } from "./model";

/**
 * Where accounts and the signed-in one are kept. The UI only talks to this, so the browser store (dev only, no
 * passwords) can be swapped for real sign-in without touching a page. Async on purpose, for that day.
 */
export interface AccountStore {
  list(): Promise<Account[]>;
  create(input: AccountInput): Promise<AccountResult>;
  /** Delete the account and what it stored. Signs it out if it was signed in. */
  remove(id: string): Promise<void>;
  /** The signed-in account, or null when nobody is. */
  current(): Promise<Account | null>;
  /** False when there is no such account. */
  signIn(id: string): Promise<boolean>;
  signOut(): Promise<void>;
}
