/**
 * What a person is in the app. An owner runs a school and can do everything a teacher can. An admin is one of us: they
 * can do everything an owner can, and open the /dev and /admin pages in production too (`isAdmin`).
 */
export const ROLES = ["student", "teacher", "owner", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher", owner: "Owner", admin: "Admin" };

/** Every account a person makes for themself starts as this. A teacher, an owner or an admin is made one by us. */
export const NEW_ACCOUNT_ROLE: Role = "student";

export interface Account {
  id: string;
  name: string;
  /** Trimmed and lower case; one account per email. */
  email: string;
  role: Role;
  /** ISO time. */
  createdAt: string;
  /** No plan chosen yet: a new account, held on /account/setup until it chooses one. */
  needsSetup: boolean;
  /**
   * Payments are on and their paid plan has no live subscription (`mustPay` in billing.ts). `needsSetup` is true too, so
   * the same gate holds them on /account/setup, which sends them to Checkout. Accounts stored before this have no field.
   */
  needsPayment?: boolean;
  /** Has a Stripe subscription they can manage (Manage billing on /account). */
  subscribed?: boolean;
  /** Keeps their plan with no payment (had one before payments came); may still pay from /account. */
  paymentExempt?: boolean;
  /** Agreed to emails about what we fix and add, and offers (`email_updates_at`). */
  emailUpdates: boolean;
  /** On the `taught` plan: a student a teacher made an account for. Accounts stored before this have no field. */
  taught: boolean;
}

/**
 * The parts of the app, each with the roles that may use it. Most are for every role; sharing a plan is for teachers and
 * owners. A new split is one line here and a `can(account, "<feature>")` where the screen decides.
 */
export const FEATURES = {
  /** The notes creator (/creator, the studio's preset notes). */
  notesCreator: ["student", "teacher", "owner", "admin"],
  /** Having the AI write a plan. */
  aiPlan: ["student", "teacher", "owner", "admin"],
  /** Sharing a plan as an invite (Share plan). Signing in is needed too: with no database there are no accounts and no sharing. */
  sharePlan: ["teacher", "owner", "admin"],
  /** Having students: making their accounts and reading and writing their plans. */
  students: ["teacher", "owner", "admin"],
} as const satisfies Record<string, readonly Role[]>;
export type Feature = keyof typeof FEATURES;

/** One of us: may open /dev and /admin in production (`devOrAdmin` in features/devtools/server/access.ts). */
export const isAdmin = (account: Account | null): boolean => account?.role === "admin";

/**
 * May this person use the feature? `null` is nobody signed in: the one local person of this browser, who can use
 * everything. That is every visitor today; when real sign-in comes, this line is where a visitor's rights are decided.
 */
export function can(account: Account | null, feature: Feature): boolean {
  if (!account) return true;
  return (FEATURES[feature] as readonly Role[]).includes(account.role);
}

/**
 * The home page that speaks to this person: the music-school page (/) for a teacher or an owner, who work for a school,
 * and the players page for a student. A student of a school gets /players too: that page talks to them as a player.
 */
export function homePage(account: Account): "/" | "/players" {
  return account.role === "student" ? "/players" : "/";
}

const isRole = (r: unknown): r is Role => (ROLES as readonly unknown[]).includes(r);

const isAccount = (a: unknown): a is Account => {
  const x = a as Account;
  return !!x && typeof x.id === "string" && !!x.id && typeof x.name === "string" && typeof x.email === "string" && isRole(x.role) && typeof x.createdAt === "string";
};

/** A stored account list, made safe: broken rows and second rows of an id or email are dropped. */
export function cleanAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const emails = new Set<string>();
  return raw.filter((a): a is Account => {
    if (!isAccount(a) || ids.has(a.id) || emails.has(a.email)) return false;
    ids.add(a.id);
    emails.add(a.email);
    return true;
  });
}

export const cleanEmail = (email: string): string => email.trim().toLowerCase();

export const isEmail = (email: string): boolean => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** A name as it is stored: trimmed, spaces folded, 80 characters at most. Empty when there is nothing left. */
export const cleanName = (name: unknown): string => (typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 80) : "");

/** The stand-in name an account made by email starts with: the part of the email before the @. */
export const emailName = (email: string): string => cleanName(email.split("@")[0]);
