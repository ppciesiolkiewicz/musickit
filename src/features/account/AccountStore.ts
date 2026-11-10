import type { Account, AccountInput, AccountResult } from "./model";

/**
 * Who is signed in, and signing out. The UI only talks to this, so where accounts live (the site's database,
 * or this browser in development) never reaches a page.
 */
export interface AccountStore {
  /** The signed-in account, or null when nobody is. */
  current(): Promise<Account | null>;
  signOut(): Promise<void>;
}

/** The development store on top: accounts kept in the browser, made and picked on /dev/account, no passwords. */
export interface DevAccountStore extends AccountStore {
  list(): Promise<Account[]>;
  create(input: AccountInput): Promise<AccountResult>;
  /** Delete the account and what it stored. Signs it out if it was signed in. */
  remove(id: string): Promise<void>;
  /** False when there is no such account. */
  signIn(id: string): Promise<boolean>;
}
