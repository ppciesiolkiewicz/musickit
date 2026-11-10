import type { Role } from "../model";

/** A user row, as the database holds it. */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export type TokenKind = "email_link" | "signup";

/** A short-lived single-use proof (see `authTokens` in lib/db/schema.ts). */
export interface TokenRow {
  kind: TokenKind;
  tokenHash: string;
  email: string;
  name: string | null;
  role: Role | null;
  provider: string | null;
  providerAccountId: string | null;
  next: string | null;
  expiresAt: Date;
}

export interface SessionRow {
  user: UserRow;
  expiresAt: Date;
}

/**
 * Everything sign-in needs from storage. `drizzleRepo` is the real one (Postgres), `memoryRepo` the one the tests use.
 * Each call takes `now`, so the logic in auth.ts stays pure.
 */
export interface AuthRepo {
  userByEmail(email: string): Promise<UserRow | null>;
  /** Null when the email already has a user. */
  createUser(input: { email: string; name: string; role: Role }, now: Date): Promise<UserRow | null>;
  updateUserName(id: string, name: string, now: Date): Promise<UserRow | null>;
  /** Deletes the user with their sessions and identities. */
  deleteUser(id: string): Promise<void>;

  userByIdentity(provider: string, providerAccountId: string): Promise<UserRow | null>;
  /** Does nothing when the identity is already linked. */
  linkIdentity(userId: string, provider: string, providerAccountId: string, now: Date): Promise<void>;

  createToken(token: TokenRow, now: Date): Promise<void>;
  /** How many tokens of this kind were made for the email since `since`. */
  countTokens(email: string, kind: TokenKind, since: Date): Promise<number>;
  /** The token when it is unused and not expired; it stays usable. */
  peekToken(tokenHash: string, kind: TokenKind, now: Date): Promise<TokenRow | null>;
  /** The same, and marks it used in one step, so two requests can't both take it. */
  takeToken(tokenHash: string, kind: TokenKind, now: Date): Promise<TokenRow | null>;

  createSession(session: { tokenHash: string; userId: string; userAgent: string | null; expiresAt: Date }, now: Date): Promise<void>;
  /** The session's user when the session has not expired. */
  sessionUser(tokenHash: string, now: Date): Promise<SessionRow | null>;
  /** Moves the expiry on and records the visit. */
  touchSession(tokenHash: string, expiresAt: Date, now: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;

  /** Housekeeping: drops expired sessions and tokens. */
  deleteExpired(now: Date): Promise<void>;
}
