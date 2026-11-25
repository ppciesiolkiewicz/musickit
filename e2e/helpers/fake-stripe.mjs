// A stand-in for the Stripe API, for the payments test server only (`npm run e2e:stripe`; the server's STRIPE_API_URL
// points here). The webhook reads each subscription back from Stripe rather than trusting the event, so the tests that
// make up their own subscriptions (e2e/stripe/webhook.spec.ts) put them here first with PUT /__e2e/subscriptions/<id>,
// and GET /v1/subscriptions/<id> answers with them. Everything else goes on to the real Stripe API, with the request's
// own key: the sandbox spec's calls when .env.e2e.local has a test key, and a Stripe error when it hasn't.
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 3212);
const STRIPE = "https://api.stripe.com";
const subs = new Map();

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => resolve(Buffer.concat(parts)));
    req.on("error", reject);
  });

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const body = await readBody(req);
    if (url.pathname === "/__e2e/health") return send(res, 200, { ok: true });

    const put = url.pathname.match(/^\/__e2e\/subscriptions\/([^/]+)$/);
    if (put && req.method === "PUT") {
      subs.set(decodeURIComponent(put[1]), JSON.parse(body.toString("utf8")));
      return send(res, 200, { ok: true });
    }

    const get = url.pathname.match(/^\/v1\/subscriptions\/([^/]+)$/);
    if (get && req.method === "GET" && subs.has(decodeURIComponent(get[1]))) return send(res, 200, subs.get(decodeURIComponent(get[1])));

    // anything else: Stripe's own answer
    const headers = {};
    for (const name of ["authorization", "content-type", "stripe-version", "idempotency-key", "stripe-account", "user-agent", "x-stripe-client-user-agent"]) {
      const v = req.headers[name];
      if (typeof v === "string") headers[name] = v;
    }
    const upstream = await fetch(STRIPE + url.pathname + url.search, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
      signal: AbortSignal.timeout(20_000),
    });
    res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    send(res, 502, { error: { type: "api_error", message: `fake-stripe: ${e instanceof Error ? e.message : String(e)}` } });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`[fake-stripe] on http://127.0.0.1:${PORT}`));
