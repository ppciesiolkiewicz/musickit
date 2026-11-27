// A local scheduler for the reminder run: calls POST /api/cron/reminders now and then on every quarter hour
// (:00, :15, :30, :45) until stopped with Ctrl+C. `npm run cron:prod` runs it under `caffeinate -i` so the Mac
// doesn't sleep while it's on. The route is safe to call twice, so restarting it never sends a reminder twice.
//
// Env (from .env.local):
//   PROD_CRON_SECRET  production's CRON_SECRET (kept apart from the local CRON_SECRET so a run never hits the wrong one)
//   CRON_URL          optional, default https://attunr.app/api/cron/reminders

const url = process.env.CRON_URL?.trim() || "https://attunr.app/api/cron/reminders";
const secret = process.env.PROD_CRON_SECRET?.trim();
if (!secret) {
  console.error("PROD_CRON_SECRET is not set. Add production's CRON_SECRET to .env.local as PROD_CRON_SECRET.");
  process.exit(1);
}

const QUARTER = 15 * 60_000;
const stamp = () => new Date().toLocaleTimeString("en-GB");

async function run() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.text();
    console.log(`${stamp()} ${res.status} ${body.slice(0, 300)}`);
  } catch (e) {
    console.error(`${stamp()} failed: ${e instanceof Error ? e.message : e}`);
  }
}

function next() {
  // A few seconds past the quarter, so the server's clock is surely on the new quarter too.
  const wait = QUARTER - (Date.now() % QUARTER) + 5_000;
  console.log(`next run at ${new Date(Date.now() + wait).toLocaleTimeString("en-GB")}`);
  setTimeout(async () => {
    await run();
    next();
  }, wait);
}

console.log(`calling ${url} every 15 minutes; Ctrl+C to stop`);
await run();
next();
