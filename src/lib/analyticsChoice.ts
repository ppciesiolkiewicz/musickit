/*
 * Whether this browser's visits may be counted (PostHog and Vercel Analytics), and what is taken out of an address
 * before it is counted. /privacy ("How we count use") promises all of it, so a change here is a change there.
 *
 * - Both services run without a cookie, so most countries need no consent: a visit is counted until the visitor says no.
 * - In the EU, the EEA and Switzerland the rule for cookieless counting is not settled, so a visitor there is asked
 *   first (`AnalyticsAsk`) and nothing is counted until they say yes.
 * - A browser that sends Global Privacy Control has already said no, anywhere.
 * - The answer is kept in the browser (`CHOICE_KEY`) and can be changed on /privacy.
 *
 * Where the visitor is comes from the host (`x-vercel-ip-country`), read in the proxy, which keeps only "ask" or
 * "count" in a cookie, never the country. With no such header (development, another host) nobody is asked.
 */

export type Region = "ask" | "count";
export type Choice = "on" | "off" | null;

export const REGION_COOKIE = "mk_region";
export const COUNTRY_HEADER = "x-vercel-ip-country";
export const CHOICE_KEY = "attunr.analytics";
/** Fired on `window` when the choice changes, so the notice and the switch on /privacy follow each other. */
export const CHOICE_EVENT = "attunr:analytics-choice";

/** The EU's 27, the EEA's three more, and Switzerland. The UK is not here: its law allows counting with a way to say no. */
const ASK_FIRST = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "CH",
]);

/** The region of a two-letter country code; an unknown or missing one counts. */
export const regionOf = (country: string | null | undefined): Region => (country && ASK_FIRST.has(country.trim().toUpperCase()) ? "ask" : "count");

export const parseRegion = (v: string | null | undefined): Region => (v === "ask" ? "ask" : "count");

export const parseChoice = (v: string | null | undefined): Choice => (v === "on" || v === "off" ? v : null);

/** May this visit be counted? A yes or a no they gave wins; else Global Privacy Control is a no; else the region decides. */
export function mayCount({ region, choice, gpc }: { region: Region; choice: Choice; gpc: boolean }): boolean {
  if (choice) return choice === "on";
  if (gpc) return false;
  return region === "count";
}

/** Is the visitor still to be asked? Only where asking comes first, with no answer yet and no Global Privacy Control. */
export const mustAsk = ({ region, choice, gpc }: { region: Region; choice: Choice; gpc: boolean }): boolean => region === "ask" && !choice && !gpc;

/**
 * An address with its secrets taken out: an invite or a shared note's id in the path, and any `token` or `code` in the
 * query. Works on a full address, a path, or any text holding one. A join code (`/join/INDIEAPPCIRCLE`, letters only, up to
 * 30) is public and stays, so its visits can be counted; an invite token is 43 random characters and never is one.
 */
export const scrubUrl = (url: string): string =>
  url
    .replace(/\/join\/(?![A-Za-z]{1,30}(?:[/?#\s]|$))[^/?#\s]+/g, "/join/[token]")
    .replace(/\/notes\/shared\/[^/?#\s]+/g, "/notes/shared/[id]")
    .replace(/([?&](?:token|code)=)[^&#\s]*/g, "$1[removed]");

/* ---- in the browser ---- */

const readRegion = (): Region => {
  const m = typeof document === "undefined" ? null : document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=([^;]*)`));
  return parseRegion(m?.[1]);
};

export const readChoice = (): Choice => {
  try {
    return parseChoice(window.localStorage.getItem(CHOICE_KEY));
  } catch {
    return null; // storage blocked: no answer is kept, and the region decides
  }
};

/** What the browser says now. On the server (no window) nothing is counted and nobody is asked. */
export function browserState(): { region: Region; choice: Choice; gpc: boolean } | null {
  if (typeof window === "undefined") return null;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  return { region: readRegion(), choice: readChoice(), gpc };
}

export const countingNow = (): boolean => {
  const s = browserState();
  return !!s && mayCount(s);
};

/** Keep their answer. False when the browser won't store it. */
export function saveChoice(choice: "on" | "off"): boolean {
  try {
    window.localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHOICE_EVENT));
  return true;
}
