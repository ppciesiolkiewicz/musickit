/** Early-access sign-ups from the landing page: what a request may carry and where each one is stored. */

export const SIGNUP_PREFIX = "early-access/";

/** What a player wants first; the landing page offers these as chips. */
export const INTERESTS = ["basic-course", "style-courses", "private-lessons", "songs-by-mode"] as const;
export type Interest = (typeof INTERESTS)[number];

export interface Signup {
  email: string;
  interests: Interest[];
  /** the page section the form sat in, so we know which pitch worked */
  source: string;
  at: number;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

/**
 * A sign-up from the raw request body, or the reason it is refused.
 * `website` is a field people never see: a bot that fills it gets a quiet ok and nothing is stored.
 */
export function parseSignup(body: unknown, now: number): { ok: true; signup: Signup } | { ok: true; bot: true } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Bad request." };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { ok: true, bot: true };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) return { ok: false, error: "That email doesn't look right." };
  const interests = Array.isArray(b.interests) ? INTERESTS.filter((i) => (b.interests as unknown[]).includes(i)) : [];
  const source = typeof b.source === "string" ? b.source.slice(0, 40).replace(/[^\w-]/g, "") : "";
  return { ok: true, signup: { email, interests, source, at: now } };
}

/** One blob per sign-up, named by time then a random tail, so two at once never overwrite each other. */
export const signupPath = (s: Signup, rand: string) => `${SIGNUP_PREFIX}${new Date(s.at).toISOString().replace(/[:.]/g, "-")}-${rand}.json`;
