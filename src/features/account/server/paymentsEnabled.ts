/** Payments are on: `STRIPE_ENABLED=true` on the server. Off, nobody is asked to pay (the beta). */
export const paymentsEnabled = (): boolean => process.env.STRIPE_ENABLED === "true";
