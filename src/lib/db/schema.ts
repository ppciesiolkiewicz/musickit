import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * The database tables. Change a table here, then `npm run db:generate` writes the SQL migration into /drizzle
 * and `npm run db:migrate` applies it. Never edit a migration that has been applied somewhere. `npm run db:diagram`
 * redraws docs/db/schema.svg (shown in the README).
 */

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Same values as `ROLES` in features/account/model.ts. */
export const userRole = pgEnum("user_role", ["student", "teacher", "owner"]);

/** How often a person pays for their plan: every month or once a year. */
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
  /** US cents a month, paid monthly. */
  monthCents: integer("month_cents").notNull(),
  /** US cents a year, paid once a year. */
  yearCents: integer("year_cents").notNull(),
  /** Days free before the first payment. */
  trialDays: integer("trial_days").notNull().default(30),
  /**
   * Old: one price for one period, before every plan had both (0013). Kept, unused and nullable, so a build that still
   * reads them keeps working while the new one deploys. Drop them in a later migration.
   */
  priceCents: integer("price_cents"),
  period: planPeriod("period"),
  /** Students a teacher can have; null is no limit, 0 a student's own plan. */
  students: integer("students"),
  autoplansPerMonth: integer("autoplans_per_month").notNull(),
  batch: boolean("batch").notNull().default(false),
  /** Can be chosen in the app. People already on a turned-off plan keep it. */
  enabled: boolean("enabled").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  /**
   * Internal, never shown or sent to a player: the chance (0 to 100) that an autoplan on this plan is written new by the
   * AI. The rest are taken from `practice_plans` enabled for reuse, at no AI cost. Always 1 to 99: no plan only reuses,
   * none always writes.
   */
  newPlanPercent: integer("new_plan_percent").notNull().default(50),
  updatedAt: at("updated_at").notNull().defaultNow(),
}, (t) => [check("plans_new_plan_percent_range", sql`${t.newPlanPercent} between 1 and 99`)]);

/**
 * The library of practice plans an autoplan can be taken from instead of asking the AI (see `plans.new_plan_percent`).
 * Seeded from the plan examples and the seed plans in src/features/library/seed (`npm run db:seed-plans`); only rows
 * `enabled_for_reuse` are given out.
 */
export const practicePlans = pgTable(
  "practice_plans",
  {
    /** The example's or seed file's id: "guitar-beginner", "voice-guitar-advanced-first-week". */
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    /** The first-questionnaire answers the plan was written for (`PlanAnswers`), to match it to a player. */
    answers: jsonb("answers").notNull(),
    /** The model that wrote it. */
    model: text("model").notNull(),
    /** The model's reply, as a pasted reply: parsed with `parsePlanConfig` when used. */
    reply: text("reply").notNull(),
    /** Where it came from: "example" for a plan example (its id is the example's), "seed" for a plan in src/features/library/seed. */
    source: text("source").notNull(),
    /** `PROMPT_VERSION` the plan was written under; null when unknown. */
    promptVersion: integer("prompt_version"),
    /** `DOC_VERSIONS.agents` and `.teaching` the plan was written to; null when unknown. */
    docsAgents: integer("docs_agents"),
    docsTeaching: integer("docs_teaching"),
    enabledForReuse: boolean("enabled_for_reuse").notNull().default(false),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("practice_plans_reuse").on(t.enabledForReuse)],
);

/** One person. Every email here was proven: by a link we mailed, or by Google. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Trimmed and lower case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  /**
   * The plan they are on. Null for a new account until it chooses one on /account/setup, which it can't leave before
   * then (a student meanwhile). Accounts made before setup asked keep the Student plan they were given.
   */
  planId: text("plan_id").references(() => plans.id),
  /** Whether they pay for the plan monthly or yearly. */
  billing: planPeriod("billing").notNull().default("year"),
  /**
   * When they agreed to emails about what we fix and add (on /account/setup or /account); null when they haven't, or
   * turned it off. Kept as a time, as the record of when they said yes.
   */
  emailUpdatesAt: at("email_updates_at"),
  createdAt: at("created_at").notNull().defaultNow(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/**
 * A person who chose a plan priced with them (Teacher Unlimited: any number of students, `pricedWithYou` in
 * features/account/plans.ts). One row a person, made the first time they choose it on /account/setup or /account, and
 * kept if they move off it: it is who we write to, to set the price. `contacted_at` is set by hand once we have.
 * /account shows it while they are on that plan.
 */
export const planRequests = pgTable("plan_requests", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  createdAt: at("created_at").notNull().defaultNow(),
  contactedAt: at("contacted_at"),
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
    /** The rated exercise's block (`blocks.id`, not a foreign key); null for a row from before blocks or whose plan is gone. */
    blockId: text("block_id"),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_entries_user_exercise").on(t.userId, t.exerciseId), index("progress_entries_block").on(t.blockId)],
);

/**
 * The day timer's record of one day of one plan, kept apart from the plan document so a timer save is a few bytes:
 * the day's used seconds and the seconds per exercise, by exercise id (`features/plan/model/planTime.ts`).
 */
export const planDayTimes = pgTable(
  "plan_day_times",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    day: integer("day").notNull(),
    elapsed: integer("elapsed").notNull(),
    spent: jsonb("spent").notNull(),
    /** Exercise (slot) id -> block id, for the slots in `spent` (`DayTime.blocks`); null on a row from before blocks. */
    blocks: jsonb("blocks"),
    /** Local yyyy-mm-dd -> seconds the timer counted on that date (`DayTime.on`); null on a row from before dates. */
    onDates: jsonb("on_dates"),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.planId, t.day] })],
);

/** Where an owner got a block: written by the AI, edited by the player, seeded by the app, or from a hand-written example. */
export const blockSource = pgEnum("block_source", ["ai", "edit", "seed", "example"]);

/**
 * The shared library of exercise blocks: one row per distinct block, whoever has it. The id is the hash of the block's
 * content and tags (`features/plan/model/blockId.ts`), so the same block is one row. Insert-only for content and tags: a row
 * is never deleted, not even when its last owner deletes their account, and its provenance is filled once, only while all
 * four provenance columns are null. Who has a block, and whether it may be reused, is in
 * `block_owners`; a block is private to its owners until one of their rows is `enabled_for_reuse`.
 */
export const blocks = pgTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    /** The block: `{ title, choice?, cells }`, cells without the editor's ids. */
    content: jsonb("content").notNull(),
    area: text("area"),
    topic: text("topic"),
    concepts: text("concepts").array().notNull().default(sql`'{}'::text[]`),
    /** The level: the highest level of `steps` when it has any, else the level the writer typed. */
    level: text("level"),
    /** The path steps it practises, "trackId:n" (`features/plan/model/path.ts`); empty for a block written before steps. */
    steps: text("steps").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** The block this one was edited from. Not a foreign key; written only when the first saver owned that block or saved it in the same document. */
    parentId: text("parent_id"),
    /** Provenance: the model that wrote the block, and the prompt and document versions it was written to. All null when unknown. */
    model: text("model"),
    promptVersion: integer("prompt_version"),
    docsAgents: integer("docs_agents"),
    docsTeaching: integer("docs_teaching"),
    /** The default slot: what the block needs to stand in a plan on its own. All null when unknown; filled once, while `minutes` is null. Never part of the id. */
    minutes: integer("minutes"),
    why: text("why"),
    learnBefore: text("learn_before").array(),
    exploreMore: text("explore_more").array(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("blocks_area").on(t.area), index("blocks_topic").on(t.topic)],
);

/**
 * The blocks of a library plan (never a player's plan), in order: one row per plan, day and place. Replaced as a whole for a
 * plan (`setPlanBlocks`). Deleting the plan drops its rows; a block is never deleted. The rows name only blocks the app owns:
 * the library shows the plan to callers who may not see a player's private block.
 */
export const practicePlanBlocks = pgTable(
  "practice_plan_blocks",
  {
    planId: text("plan_id").notNull().references(() => practicePlans.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    place: integer("place").notNull(),
    blockId: text("block_id").notNull().references(() => blocks.id),
    minutes: integer("minutes").notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.day, t.place] }), index("practice_plan_blocks_block").on(t.blockId)],
);

/**
 * Who has a block: one row per owner and block. `user_id` null is the app (seeded and example blocks); the unique pair
 * treats nulls as equal, so the app owns a block once. Deleting an account drops its rows here, never the block.
 * Insert-only from a plan save (`on conflict do nothing`); `enabled_for_reuse` is turned on by hand.
 */
export const blockOwners = pgTable(
  "block_owners",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull().references(() => blocks.id),
    source: blockSource("source").notNull(),
    enabledForReuse: boolean("enabled_for_reuse").notNull().default(false),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [unique("block_owners_user_block").on(t.userId, t.blockId).nullsNotDistinct(), index("block_owners_block").on(t.blockId)],
);

/**
 * A player's stars for a whole plan, and why when they gave few: one row per player and plan, replaced by the next save.
 * `library_plan_id` is the `practice_plans` row the plan was taken from, if any. `title` is the plan's, for `/dev/plan-reviews`.
 */
export const planReviews = pgTable(
  "plan_reviews",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    libraryPlanId: text("library_plan_id").references(() => practicePlans.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    stars: integer("stars").notNull(),
    why: text("why"),
    at: at("at").notNull(),
  },
  (t) => [uniqueIndex("plan_reviews_user_plan").on(t.userId, t.planId), index("plan_reviews_at").on(t.at), check("plan_reviews_stars_range", sql`${t.stars} between 1 and 5`)],
);

/**
 * A conversation between a signed-in user and us (features/messages), or one contact form message from a visitor
 * (`user_id` null, `email` set). A user may have several. `last_user_at` / `last_admin_at` and the two read times say
 * what is unread on each side without reading the messages. `emailed_at` is when we were last emailed about it (at most
 * once in 10 minutes). Read and answered at /admin/messages.
 */
export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 'support' today; teacher and student threads later. */
    kind: text("kind").notNull().default("support"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    status: text("status").notNull().default("open"),
    lastAt: at("last_at").notNull(),
    lastUserAt: at("last_user_at"),
    lastAdminAt: at("last_admin_at"),
    userReadAt: at("user_read_at"),
    adminReadAt: at("admin_read_at"),
    emailedAt: at("emailed_at"),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("message_threads_user").on(t.userId, t.lastAt), index("message_threads_status").on(t.status, t.lastAt), check("message_threads_status_value", sql`${t.status} in ('open', 'closed')`)],
);

/** One message in a thread, from the user or from us. `context` is where the user sent it from (`MessageContext`). */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
    fromAdmin: boolean("from_admin").notNull(),
    body: text("body").notNull(),
    context: jsonb("context"),
    at: at("at").notNull(),
  },
  (t) => [index("messages_thread").on(t.threadId, t.at)],
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
