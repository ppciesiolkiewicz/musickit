/**
 * The versions of the terms of use (/terms). A version's number is saved with each account that agrees to it, on
 * /account/setup or with an invite (`users.terms_version`), so we know which words each person agreed to. A number is
 * never reused and its words are never edited: a changed term is a new number, with the date it was written (not for a
 * typo). Two are in use at once: the beta terms while payments are off, the paid terms while `STRIPE_ENABLED` is "true".
 */
export const TERMS_VERSIONS = {
  /** the open beta: everything free, nothing charged */
  1: { updated: "24 November 2026" },
  /** paid plans: no beta section, no "nothing is charged during the beta" */
  2: { updated: "25 November 2026" },
  /** the beta terms with no early-price section (an offer, not a term), no lines saying no AI writes plans or reads them, no Notes in what attunr is, no line saying what you make is yours, and prices in Australian dollars, not US */
  3: { updated: "27 November 2026" },
  /** the paid terms with the same cuts */
  4: { updated: "27 November 2026" },
} as const;

export type TermsVersion = keyof typeof TERMS_VERSIONS;

/** The version of the terms shown and agreed to now: the paid terms with payments on, else the beta terms. */
export const termsVersion = (paymentsOn: boolean): TermsVersion => (paymentsOn ? 4 : 3);

/** The date the privacy policy (/privacy) last changed, shown on that page. Raise it when the policy changes: what we keep, why, or which company handles it. */
export const PRIVACY_UPDATED = "23 November 2026";
