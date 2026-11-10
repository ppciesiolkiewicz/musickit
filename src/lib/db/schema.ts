import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * The database tables. Change a table here, then `npm run db:generate` writes the SQL migration into /drizzle
 * and `npm run db:migrate` applies it. Never edit a migration that has been applied somewhere.
 */

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Same values as `ROLES` in features/account/model.ts. */
export const userRole = pgEnum("user_role", ["student", "teacher", "owner"]);

/** One person. Every email here was proven: by a link we mailed, or by Google. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Trimmed and lower case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  createdAt: at("created_at").notNull().defaultNow(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** A sign-in with another service (Google) tied to a user. */
export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    /** The service's own id for the person (Google's `sub`). */
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("identities_provider_account").on(t.provider, t.providerAccountId), index("identities_user").on(t.userId)],
);

/** A signed-in browser. The cookie holds the token; only its SHA-256 is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: at("created_at").notNull().defaultNow(),
    lastSeenAt: at("last_seen_at").notNull().defaultNow(),
    expiresAt: at("expires_at").notNull(),
  },
  (t) => [index("sessions_user").on(t.userId), index("sessions_expires").on(t.expiresAt)],
);

export const authTokenKind = pgEnum("auth_token_kind", ["email_link", "signup"]);

/**
 * Short-lived, single-use proofs. `email_link`: the link mailed to log in or register (name and role are set when it
 * came from the register form). `signup`: the email is proven (by a link or Google) but there is no account yet, and
 * the person still has to give a name and a role.
 */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: authTokenKind("kind").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    name: text("name"),
    role: userRole("role"),
    provider: text("provider"),
    providerAccountId: text("provider_account_id"),
    /** The page to open after signing in. */
    next: text("next"),
    createdAt: at("created_at").notNull().defaultNow(),
    expiresAt: at("expires_at").notNull(),
    usedAt: at("used_at"),
  },
  (t) => [index("auth_tokens_email").on(t.email, t.createdAt), index("auth_tokens_expires").on(t.expiresAt)],
);
