import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Permission } from "../../features/account/model";
import type { BlockVideos } from "../../features/contentVideos/server/rules";

/**
 * The database tables. Change a table here, then `npm run db:generate` writes the SQL migration into /drizzle
 * and `npm run db:migrate` applies it. Never edit a migration that has been applied somewhere. `npm run db:diagram`
 * redraws docs/db/schema.svg (shown in the README).
 *
 * Every table ends in `.enableRLS()` with no policies: Supabase serves the `public` schema over its Data API to anyone
 * holding the public anon key, and row level security with no policies shuts that out. The app connects as the table
 * owner (`postgres` on Supabase), which bypasses it. schema.test.ts fails on a table without it.
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
  /**
   * Cents a month, paid monthly, in `CURRENCY` (Australian dollars, `features/account/plans.ts`), GST included. The
   * same number is the US dollar price, before sales tax (`ALSO_IN` in `server/stripe.ts`).
   */
  monthCents: integer("month_cents").notNull(),
  /** Cents a year, paid once a year: A$ with GST, and the same number in US$ before sales tax. */
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
  /** Extra students a month on top of `students`, free (Solo 2, Music school 3); 0 for a plan with no limit or none set. */
  extraStudents: integer("extra_students").notNull().default(0),
  autoplansPerMonth: integer("autoplans_per_month").notNull(),
  batch: boolean("batch").notNull().default(false),
  /** Can be chosen in the app. People already on a turned-off plan keep it. */
  enabled: boolean("enabled").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: at("updated_at").notNull().defaultNow(),
}).enableRLS();

/** One person. Every email here was proven: by a link we mailed, or by Google. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Trimmed and lower case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  /**
   * What of the pages for building and running the app they may open in production: any of `dev`, `content`, `admin`
   * (`PERMISSIONS` in features/account/model.ts; a check keeps out anything else). Set on /admin/users.
   */
  permissions: text("permissions").array().$type<Permission[]>().notNull().default(sql`'{}'::text[]`),
  /**
   * The plan they are on. Null for a new account until it chooses one on /account/setup, which it can't leave before
   * then (a student meanwhile). Accounts made before setup asked keep the Student plan they were given.
   */
  planId: text("plan_id").references(() => plans.id),
  /** Whether they pay for the plan monthly or yearly. */
  billing: planPeriod("billing").notNull().default("year"),
  /**
   * Keeps their plan with no payment when payments are on (`STRIPE_ENABLED`): every account that had a plan before
   * payments came (migration 0040). Cleared when they move to another paid plan or start paying.
   */
  paymentExempt: boolean("payment_exempt").notNull().default(false),
  /**
   * When their plan stops: set only by a join code (`JOIN_CODES` in features/account/server/invites.ts), cleared by any
   * other plan change. Past it the account is held on /account/setup to choose a plan, as if it had none.
   */
  planEndsAt: at("plan_ends_at"),
  /** Their Stripe customer, made at their first Checkout; null before. */
  stripeCustomerId: text("stripe_customer_id").unique(),
  /** Their Stripe subscription, the latest one; null before they first paid. */
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** The subscription's Stripe status ("trialing", "active", "past_due", "canceled", …), kept in step by the webhook. */
  subscriptionStatus: text("subscription_status"),
  /**
   * When they agreed to emails about what we fix and add (on /account/setup or /account); null when they haven't, or
   * turned it off. Kept as a time, as the record of when they said yes.
   */
  emailUpdatesAt: at("email_updates_at"),
  /** When they agreed to the terms of use, on /account/setup; null for an account that hasn't set up yet. */
  termsAcceptedAt: at("terms_accepted_at"),
  /** Which terms they agreed to: the version's number (`TERMS_VERSIONS` in features/account/terms.ts). */
  termsVersion: integer("terms_version"),
  createdAt: at("created_at").notNull().defaultNow(),
  updatedAt: at("updated_at").notNull().defaultNow(),
}, (t) => [check("users_permissions_known", sql`${t.permissions} <@ array['dev','content','admin']::text[]`)]).enableRLS();

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
}).enableRLS();

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
).enableRLS();

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
).enableRLS();

export const authTokenKind = pgEnum("auth_token_kind", ["email_link", "signup", "claim"]);

/**
 * Short-lived, single-use proofs. `email_link`: the link mailed to log in or register (name and role are set when it
 * came from the register form). `signup`: the email is proven (by a link or Google) but there is no account yet, and
 * the person still has to give a name and a role. `claim`: the link a teacher gives a student they made an account for,
 * to sign in to it (the token's email is the student's).
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
).enableRLS();

/**
 * A teacher and their student (a normal `users` row of its own). A student has one teacher, so `student_id` is unique.
 * `claimed_at` is null until the student first signs in to the account the teacher made for them.
 */
export const teacherStudents = pgTable(
  "teacher_students",
  {
    teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    createdAt: at("created_at").notNull().defaultNow(),
    claimedAt: at("claimed_at"),
    /** The teacher's day the teacher last gave this student a week (added them, made or rotated a week): active that month. */
    plannedOn: date("planned_on", { mode: "string" }),
  },
  (t) => [primaryKey({ columns: [t.teacherId, t.studentId] })],
).enableRLS();

/**
 * A link we send a teacher to try the app on a plan no one can choose (`plan_id`, the Teacher Demo: 2 students, free).
 * Made on /admin/invites; `token_hash` is the SHA-256 of the token in the link, used to look it up. `token` is the token
 * itself, kept so /admin/invites can copy the link again (null for invites made before it was kept). `note` says who it
 * was for. Used once: `claimed_by` and `claimed_at` are set when a signed-in person opens it and joins.
 */
export const teacherInvites = pgTable(
  "teacher_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    token: text("token"),
    planId: text("plan_id").notNull().references(() => plans.id),
    note: text("note").notNull().default(""),
    createdAt: at("created_at").notNull().defaultNow(),
    claimedBy: uuid("claimed_by").references(() => users.id, { onDelete: "set null" }),
    claimedAt: at("claimed_at"),
  },
  (t) => [index("teacher_invites_created").on(t.createdAt)],
).enableRLS();

/** One JSON document of a player's data per kind (their notes, their plans, and so on). */
export const userDocuments = pgTable(
  "user_documents",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull(),
    /** +1 on every write; a save that names an older version is refused, so a write made elsewhere is never overwritten unseen. */
    version: integer("version").notNull().default(0),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_documents_user_kind").on(t.userId, t.kind)],
).enableRLS();

/** A player's progress on one exercise. */
export const progressEntries = pgTable(
  "progress_entries",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    entry: jsonb("entry").notNull(),
    /** The rated exercise's block (`blocks.id`, not a foreign key); null for a row from before blocks or whose plan is gone. */
    blockId: text("block_id"),
    /** The rated exercise's choice (`choices.id`, not a foreign key); null for a hashed block, a row from before choices or whose plan is gone. */
    choiceId: text("choice_id"),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_entries_user_exercise").on(t.userId, t.exerciseId), index("progress_entries_block").on(t.blockId), index("progress_entries_choice").on(t.choiceId)],
).enableRLS();

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
).enableRLS();

/** Where an owner got a block: written by the AI, edited by the player, seeded by the app, or from a hand-written example. */
export const blockSource = pgEnum("block_source", ["ai", "edit", "seed", "example"]);

/**
 * The shared library of exercise blocks: one row per distinct block, whoever has it. The id is the hash of the block's
 * content and tags (`features/plan/model/blockId.ts`), so the same block is one row. Insert-only for content and tags: a row
 * is never deleted, not even when its last owner deletes their account, and its provenance is filled once, only while all
 * four provenance columns are null. A curated block (`kind` 'curated': the seed's, with a fixed readable id) is the exception:
 * the seed updates it in place, and its steps and level are empty (they live on its choices). Who has a block is in
 * `block_owners`. A hashed block is private to its owners; a curated block is in the library while one of its choices is active.
 */
export const blocks = pgTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    /** 'hashed': the id is the hash of the content, insert-only. 'curated': a seed block with a fixed readable id, updated in place by the seed. */
    kind: text("kind").notNull().default("hashed"),
    /** The block: `{ title, choice?, cells }`, cells without the editor's ids. */
    content: jsonb("content").notNull(),
    area: text("area"),
    topic: text("topic"),
    concepts: text("concepts").array().notNull().default(sql`'{}'::text[]`),
    /** The level: the highest level of `steps` when it has any, else the level the writer typed. Null on a curated block (see its choices). */
    level: text("level"),
    /** The path steps it practises, "trackId:n" (`features/plan/model/path.ts`); empty for a block written before steps and for a curated block (see its choices). */
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
    /**
     * How many times the seed has written this block: 1 when it is first stored, one more each time `db:seed-blocks`
     * finds its file changed (the block's own columns, or any of its choices). A run that changes nothing leaves it.
     * A hashed block is never rewritten, so it stays 1.
     */
    revision: integer("revision").notNull().default(1),
    /** The videos of a curated block's tool cells (`cells`: cell index to content video id). The seed never writes it. Null when it has none. */
    videos: jsonb("videos").$type<BlockVideos>(),
    /**
     * A curated block's riff as last saved in the riff maker (`RiffEdit` in `features/devtools/riff/blocks.ts`: key, scale,
     * tempo, notes, amp), checked again where it is read. The seed lays it over the file's riff while `riff_edited_at` is set;
     * `db:pull-riffs` writes it into the file. Null for a riff never edited in the app.
     */
    riffEdit: jsonb("riff_edit"),
    riffEditedAt: at("riff_edited_at"),
    riffEditedBy: uuid("riff_edited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("blocks_area").on(t.area), index("blocks_topic").on(t.topic)],
).enableRLS();

/**
 * A choice of a curated block: one way to play it, with its own name, level, steps, moves, settings and minutes. The seed
 * writes them (`kind` 'curated' blocks only). A choice is never deleted: one that leaves the seed gets `active` false, so
 * progress and plan rows that name it keep a row to point at. `name` is unique within a block; `place` orders them.
 */
export const choices = pgTable(
  "choices",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id").notNull().references(() => blocks.id),
    name: text("name").notNull(),
    level: text("level"),
    steps: text("steps").array().notNull().default(sql`'{}'::text[]`),
    moves: jsonb("moves"),
    set: jsonb("set").notNull().default(sql`'{}'::jsonb`),
    minutes: integer("minutes").notNull(),
    active: boolean("active").notNull().default(true),
    place: integer("place").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("choices_block_name").on(t.blockId, t.name), index("choices_block").on(t.blockId), index("choices_active").on(t.active)],
).enableRLS();

/**
 * Who has a block: one row per owner and block. `user_id` null is the app (seeded and example blocks); the unique pair
 * treats nulls as equal, so the app owns a block once. Deleting an account drops its rows here, never the block.
 * Insert-only from a plan save (`on conflict do nothing`).
 */
export const blockOwners = pgTable(
  "block_owners",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull().references(() => blocks.id),
    source: blockSource("source").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [unique("block_owners_user_block").on(t.userId, t.blockId).nullsNotDistinct(), index("block_owners_block").on(t.blockId)],
).enableRLS();

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
).enableRLS();

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
).enableRLS();

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
).enableRLS();

/**
 * A video the site shows, saved by someone with the `content` permission: the file is in the private Blob store at
 * `blobPath`. `madeFor` is where it was made (`tool:<tool key>` or a block id). A tool's video covers `steps` of `tool`
 * (`<ladder id>:<key>` or `none`; null `steps` for a tool with no ladder); one video per tool and step. A video with no
 * steps keeps its row and file, `tool` and `steps` null. The id is the browser's, so the file path is known before the row.
 */
export const contentVideos = pgTable(
  "content_videos",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    madeFor: text("made_for").notNull(),
    tool: text("tool"),
    steps: text("steps").array(),
    type: text("type").notNull(),
    seconds: integer("seconds").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    blobPath: text("blob_path").notNull().unique(),
    overlay: jsonb("overlay"),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("content_videos_tool_idx").on(t.tool)],
).enableRLS();

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
).enableRLS();

/** The videos a share shows. */
export const shareVideos = pgTable(
  "share_videos",
  {
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.videoId] }), index("share_videos_video_id_idx").on(t.videoId)],
).enableRLS();

/** A player who took a shared plan as their own. */
export const planClaims = pgTable(
  "plan_claims",
  {
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.userId] }), index("plan_claims_user_id_idx").on(t.userId)],
).enableRLS();

/**
 * A player's singing voice (`SingerVoice` in features/theory/voiceRange.ts), one row a player, none while it is not
 * known. Either a voice type (`type`, a key of `VOICES`: the singing tools then use that type's range from its
 * definition) or a range of the player's own, found with the microphone (`low` and `high`, MIDI notes), never both.
 * Written by the player (`PUT /api/me/voice`), or by a teacher when they add the student.
 */
export const userVoices = pgTable(
  "user_voices",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    type: text("type"),
    low: integer("low"),
    high: integer("high"),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("user_voices_type_or_range", sql`(${t.type} is not null and ${t.low} is null and ${t.high} is null) or (${t.type} is null and ${t.low} is not null and ${t.high} is not null and ${t.low} < ${t.high})`),
  ],
).enableRLS();

/**
 * A player's daily reminder email (`features/reminders`): a local quarter-hour time in their browser's time zone, and
 * the local date it last went out. The scheduler's run (`POST /api/cron/reminders`) claims `sent_on` before it sends, so
 * two runs at once send one email. No row: no reminder.
 */
export const reminders = pgTable(
  "reminders",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    time: text("time").notNull(),
    zone: text("zone").notNull(),
    sentOn: date("sent_on", { mode: "string" }),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [check("reminders_time_quarter", sql`${t.time} ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$'`)],
).enableRLS();

/**
 * One paid Stripe invoice: a completed order. Written by the Stripe webhook (`invoice.paid`), one row per invoice, so
 * a repeated event changes nothing. The trial's first invoice is paid at $0 and is kept too: it marks the start.
 * The plan and billing are the account's at the time (from the invoice's price), kept so a later plan change or a
 * deleted plan row doesn't rewrite what was bought.
 */
export const payments = pgTable(
  "payments",
  {
    /** Stripe's invoice id ("in_…"). */
    id: text("id").primaryKey(),
    /** Null once the account is deleted: the record of the money stays. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    /** The plan and billing paid for (not a foreign key: kept when the plan row goes). */
    planId: text("plan_id"),
    billing: planPeriod("billing"),
    /** Paid, in the currency's smallest unit (US cents), after discounts. */
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    /** Stripe's reason: "subscription_create", "subscription_cycle", "subscription_update", … */
    reason: text("reason"),
    /** The invoice number people see on the receipt, and Stripe's page for it. */
    number: text("number"),
    invoiceUrl: text("invoice_url"),
    paidAt: at("paid_at").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (t) => [index("payments_user").on(t.userId)],
).enableRLS();
