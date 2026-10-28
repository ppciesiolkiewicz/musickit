import { SeverityNumber } from "@opentelemetry/api-logs";
import { put } from "@vercel/blob";
import { after } from "next/server";
import { flushPostHogLogs, posthogLogsLogger } from "../../../../instrumentation";
import { blobToken } from "@/features/nam/server/cloud";
import { parseSignup, signupPath } from "@/features/earlyAccess/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Join the early-access list: JSON { email, interests?, source? }. Each sign-up is one private blob under early-access/. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  const r = parseSignup(body, Date.now());
  if (!r.ok) return json({ error: r.error }, 400);
  if (!("signup" in r)) return json({ ok: true });
  const token = blobToken(process.env);
  if (!token) return json({ error: "Sign-ups aren't open on this site yet." }, 503);
  try {
    await put(signupPath(r.signup, Math.random().toString(36).slice(2, 8)), JSON.stringify(r.signup), { access: "private", addRandomSuffix: false, contentType: "application/json", token });
    posthogLogsLogger?.emit({
      body: "Early-access signup stored",
      severityNumber: SeverityNumber.INFO,
      attributes: { action: "early_access_signup_stored" },
    });
    after(flushPostHogLogs);
    return json({ ok: true });
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 502);
  }
}
