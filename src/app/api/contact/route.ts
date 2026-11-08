import { SeverityNumber } from "@opentelemetry/api-logs";
import { put } from "@vercel/blob";
import { after } from "next/server";
import { flushPostHogLogs, posthogLogsLogger } from "@/lib/posthogLogs";
import { blobToken } from "@/features/nam/server/cloud";
import { contactEmail, contactPath, parseContact } from "@/features/contact/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Contact form: JSON { email, message, source? }. The message is emailed through Resend (RESEND_API_KEY) and/or stored as a private blob under contact/.
 * It succeeds if at least one of the two worked; it fails (503) only when neither is set up, so nothing is lost silently.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  const r = parseContact(body, Date.now());
  if (!r.ok) return json({ error: r.error }, 400);
  if (!("contact" in r)) return json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const token = blobToken(process.env);
  if (!apiKey && !token) return json({ error: "Messages aren't open on this site yet." }, 503);

  const sent = await Promise.allSettled([
    apiKey
      ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(contactEmail(r.contact, process.env)),
        }).then((res) => {
          if (!res.ok) throw new Error(`resend ${res.status}`);
        })
      : Promise.reject(new Error("no email key")),
    token
      ? put(contactPath(r.contact, Math.random().toString(36).slice(2, 8)), JSON.stringify(r.contact), { access: "private", addRandomSuffix: false, contentType: "application/json", token })
      : Promise.reject(new Error("no blob token")),
  ]);
  if (sent.every((s) => s.status === "rejected")) return json({ error: "Something went wrong. Please try again." }, 502);

  posthogLogsLogger?.emit({
    body: "Contact message received",
    severityNumber: SeverityNumber.INFO,
    attributes: { action: "contact_message", emailed: sent[0].status === "fulfilled", stored: sent[1].status === "fulfilled" },
  });
  after(flushPostHogLogs);
  return json({ ok: true });
}
