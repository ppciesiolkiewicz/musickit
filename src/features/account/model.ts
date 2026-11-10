/** What a person is in the app. An owner runs a school and can do everything a teacher can. */
export const ROLES = ["student", "teacher", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher", owner: "Owner" };

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

export interface AccountInput {
  name: string;
  email: string;
  role: Role;
}

/** Why an account could not be made: no name, not an email address, or the email already has an account. */
export type AccountError = "name" | "email" | "taken";
export type AccountResult = { ok: true; account: Account } | { ok: false; error: AccountError };

export const cleanEmail = (email: string): string => email.trim().toLowerCase();

/** The account the input makes, or what is wrong with it. `id` and `now` are passed in so this stays pure. */
export function makeAccount(list: Account[], input: AccountInput, id: string, now: string): AccountResult {
  const name = input.name.trim();
  const email = cleanEmail(input.email);
  if (!name) return { ok: false, error: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email" };
  if (list.some((a) => a.email === email)) return { ok: false, error: "taken" };
  return { ok: true, account: { id, name, email, role: isRole(input.role) ? input.role : "student", createdAt: now } };
}

/** The storage key that holds `base` for one account: its own copy when signed in, the shared key when not. */
export const keyFor = (base: string, accountId: string | null): string => (accountId ? `${base}@${accountId}` : base);
