import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * The database tables. Change a table here, then `npm run db:generate` writes the SQL migration into /drizzle
 * and `npm run db:migrate` applies it. Never edit a migration that has been applied somewhere.
 */

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Same values as `ROLES` in features/account/model.ts. */
export const userRole = pgEnum("user_role", ["student", "teacher", "owner"]);

export const planPeriod = pgEnum("plan_period", ["month", "year"]);

/**
 * What a person pays for and gets (`Plan` in features/account/plans.ts). The rows are written by the migration that made
 * the table (0005_plans) and changed here in the database: a price, an allowance, `enabled`.
 */
export const plans = pgTable("plans", {
  /** "student", "teacher-basic" … */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** The role the plan gives; "student" or "teacher". */
  role: userRole("role").notNull(),
  priceCents: integer("price_cents").notNull(),
  period: planPeriod("period").notNull(),
  /** Students a teacher can have; null is no limit, 0 a student's own plan. */
  students: integer("students"),
  autoplansPerMonth: integer("autoplans_per_month").notNull(),
  planModel: text("plan_model").notNull(),
  noteModel: text("note_model").notNull(),
  batch: boolean("batch").notNull().default(false),
  /** Can be chosen in the app. People already on a turned-off plan keep it. */
  enabled: boolean("enabled").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** One person. Every email here was proven: by a link we mailed, or by Google. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Trimmed and lower case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  /** The plan they are on; every account starts on Student. */
  planId: text("plan_id").notNull().default("student").references(() => plans.id),
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
    /** An email link's 6-digit code, hashed with the email, and how many tries it has taken. */
    codeHash: text("code_hash"),
    tries: integer("tries").notNull().default(0),
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

/** One JSON document of a player's data per kind (their notes, their plans, and so on). */
export const userDocuments = pgTable(
  "user_documents",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_documents_user_kind").on(t.userId, t.kind)],
);

/** A player's progress on one exercise. */
export const progressEntries = pgTable(
  "progress_entries",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    entry: jsonb("entry").notNull(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_entries_user_exercise").on(t.userId, t.exerciseId)],
);

/** A video a player uploaded. The file is in the private blob store at `blobPath`. */
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull(),
    seconds: integer("seconds").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    blobPath: text("blob_path").notNull().unique(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("videos_user_id_idx").on(t.userId)],
);

export const shareKind = pgEnum("share_kind", ["note", "plan"]);

/** A frozen copy of a note or a plan, opened by its link. `stoppedAt` is set when the owner stops sharing. */
export const shares = pgTable(
  "shares",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: shareKind("kind").notNull(),
    itemId: text("item_id").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
    stoppedAt: at("stopped_at"),
  },
  (t) => [index("shares_user_kind_item").on(t.userId, t.kind, t.itemId)],
);

/** The videos a share shows. */
export const shareVideos = pgTable(
  "share_videos",
  {
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.videoId] }), index("share_videos_video_id_idx").on(t.videoId)],
);

/** A player who took a shared plan as their own. */
export const planClaims = pgTable(
  "plan_claims",
  {
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.userId] }), index("plan_claims_user_id_idx").on(t.userId)],
);
