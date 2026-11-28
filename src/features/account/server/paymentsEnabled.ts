/** Payments are on: `STRIPE_ENABLED=true` on the server. Off, nobody is asked to pay (the beta). */
export const paymentsEnabled = (): boolean => process.env.STRIPE_ENABLED === "true";

/**
 * The early price (`EARLY_OFFER`, half price) is what a new subscriber pays: always in the beta, where nothing is
 * charged, and with payments on while `STRIPE_EARLY_COUPON` is set, since Checkout takes the half off with that coupon.
 * So the plan cards never show a price Checkout won't charge. No count of places closes it (user, 2026-11-28): the
 * count, `earlyTaken`, is /kickstarter's alone.
 */
export const earlyPriceOn = (): boolean => !paymentsEnabled() || !!process.env.STRIPE_EARLY_COUPON;
