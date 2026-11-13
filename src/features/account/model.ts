/** What a person is in the app. An owner runs a school and can do everything a teacher can. */
export const ROLES = ["student", "teacher", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher", owner: "Owner" };

/** Every account a person makes for themself starts as this. A teacher or an owner is made one by us. */
export const NEW_ACCOUNT_ROLE: Role = "student";

export interface Account {
  id: string;
  name: string;
  /** Trimmed and lower case; one account per email. */
  email: string;
  role: Role;
  /** ISO time. */
  createdAt: string;
}

/**
 * The parts of the app that belong to some roles only, each with the roles that may use it.
 * A new split is one line here and a `can(account, "<feature>")` where the screen decides.
 */
export const FEATURES = {
  /** The notes creator (/creator, the studio's preset notes). */
  notesCreator: ["teacher", "owner"],
  /** Having the AI write a plan. A student gets plans from a teacher. */
  aiPlan: ["teacher", "owner"],
} as const satisfies Record<string, readonly Role[]>;
export type Feature = keyof typeof FEATURES;

/**
 * May this person use the feature? `null` is nobody signed in: the one local person of this browser, who can use
 * everything. That is every visitor today; when real sign-in comes, this line is where a visitor's rights are decided.
 */
export function can(account: Account | null, feature: Feature): boolean {
  if (!account) return true;
  return (FEATURES[feature] as readonly Role[]).includes(account.role);
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
