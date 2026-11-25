/**
 * What a person is in the app: the role their plan gives (`roleOnPlan`). An owner runs a school and can do everything a
 * teacher can. What of /admin they may open is a separate list, `permissions`.
 */
export const ROLES = ["student", "teacher", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher", owner: "Owner" };

/**
 * What of the pages for building and running the app a person may open in production (in development everything is
 * open): `dev` the /admin/dev pages, `content` the content pages, `admin` the /admin pages and setting these. None implies
 * another. Set per person on /admin/admin/users.
 */
export const PERMISSIONS = ["dev", "content", "admin"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = { dev: "Dev", content: "Content", admin: "Admin" };

/** Every account a person makes for themself starts as this. A teacher or an owner is made one by us. */
export const NEW_ACCOUNT_ROLE: Role = "student";

export interface Account {
  id: string;
  name: string;
  /** Trimmed and lower case; one account per email. */
  email: string;
  role: Role;
  /** What of /admin they may open (`hasPermission`); empty for nearly everyone. */
  permissions: Permission[];
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
  notesCreator: ["student", "teacher", "owner"],
  /** Having the AI write a plan. */
  aiPlan: ["student", "teacher", "owner"],
  /** Sharing a plan as an invite (Share plan). Signing in is needed too: with no database there are no accounts and no sharing. */
  sharePlan: ["teacher", "owner"],
  /** Having students: making their accounts and reading and writing their plans. */
  students: ["teacher", "owner"],
} as const satisfies Record<string, readonly Role[]>;
export type Feature = keyof typeof FEATURES;

/** Has this person the permission? Nobody signed in has none (the gates open development by themselves). */
export const hasPermission = (account: Account | null, p: Permission): boolean => !!account?.permissions?.includes(p);

/**
 * A permission list from outside (a request, a stored account): the known values once each, in `PERMISSIONS` order.
 * Null when it isn't a list or holds anything else.
 */
export function cleanPermissions(raw: unknown): Permission[] | null {
  if (!Array.isArray(raw) || raw.some((p) => !(PERMISSIONS as readonly unknown[]).includes(p))) return null;
  return PERMISSIONS.filter((p) => raw.includes(p));
}

/**
 * May this person use the feature? `null` is nobody signed in: the one local person of this browser, who can use
 * everything. The admin permission opens every feature, whatever the role.
 */
export function can(account: Account | null, feature: Feature): boolean {
  if (!account) return true;
  return (FEATURES[feature] as readonly Role[]).includes(account.role) || hasPermission(account, "admin");
}

/**
 * The home page that speaks to this person: the music-school page (/schools) for a teacher or an owner, who work for a
 * school, and the solo musicians' page (/) for a student. A student of a school gets / too: that page talks to them as a player.
 */
export function homePage(account: Account): "/" | "/schools" {
  return account.role === "student" ? "/" : "/schools";
}

const isRole = (r: unknown): r is Role => (ROLES as readonly unknown[]).includes(r);

const isAccount = (a: unknown): a is Account => {
  const x = a as Account;
  return !!x && typeof x.id === "string" && !!x.id && typeof x.name === "string" && typeof x.email === "string" && isRole(x.role) && typeof x.createdAt === "string";
};

/**
 * A stored account list, made safe: broken rows and second rows of an id or email are dropped, and a missing or broken
 * permission list is empty.
 */
export function cleanAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const emails = new Set<string>();
  return raw
    .filter((a): a is Account => {
      if (!isAccount(a) || ids.has(a.id) || emails.has(a.email)) return false;
      ids.add(a.id);
      emails.add(a.email);
      return true;
    })
    .map((a) => ({ ...a, permissions: cleanPermissions(a.permissions) ?? [] }));
}

export const cleanEmail = (email: string): string => email.trim().toLowerCase();

export const isEmail = (email: string): boolean => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** A name as it is stored: trimmed, spaces folded, 80 characters at most. Empty when there is nothing left. */
export const cleanName = (name: unknown): string => (typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 80) : "");

/** The stand-in name an account made by email starts with: the part of the email before the @. */
export const emailName = (email: string): string => cleanName(email.split("@")[0]);
