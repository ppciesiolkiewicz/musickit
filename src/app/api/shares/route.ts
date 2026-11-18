import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { liveLinks, shareNote, shareNoteBlock, sharePlan } from "@/features/userData/server/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_NOTE = "This note is empty. Add a widget, then press Share.";
const TOO_BIG = "This note is too big to share.";
const NOT_TEACHER = "Only a teacher account can share a plan.";
const NO_SUCH_PLAN = "This plan isn't in your plans any more, so it wasn't shared. Reload the page, then press Share.";
const UPLOADING = (kind: "note" | "plan") => `A video in this ${kind} is still uploading. Wait until it's up, then press Share.`;

/**
 * Share a note as a frozen public link: JSON { kind: "note" } shares the stored note; { kind: "note", note } shares that
 * block instead (the studio's stage), never stored as the note. { kind: "plan", planId } shares that plan as an invite: the
 * own current plan or a given one (teachers and owners: 403 `not-allowed` otherwise, 404 `not-found` for any other id);
 * its item is the plan's id.
 * A note or plan naming a recording that isn't one of the sharer's uploaded videos is 409 `video-not-uploaded`.
 * Answers { share: { id, createdAt } }.
 */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  const now = new Date();
  if (body?.kind === "plan") {
    if (typeof body.planId !== "string") return json({ error: "Send { kind: \"plan\", planId }." }, 400, me.cookies);
    const done = await sharePlan(store.repo, me.account, body.planId, now);
    if ("error" in done && done.error === "video-not-uploaded") return json({ error: UPLOADING("plan"), code: done.error }, 409, me.cookies);
    if ("error" in done) return done.error === "not-allowed" ? json({ error: NOT_TEACHER, code: "not-allowed" }, 403, me.cookies) : json({ error: NO_SUCH_PLAN, code: "not-found" }, 404, me.cookies);
    return json({ share: { id: done.id, createdAt: now.toISOString() } }, 200, me.cookies);
  }
  if (body?.kind !== "note") return json({ error: "Send { kind: \"note\" } or { kind: \"plan\" }." }, 400, me.cookies);
  const done = "note" in body ? await shareNoteBlock(store.repo, me.account, body.note, now) : await shareNote(store.repo, me.account, now);
  if ("error" in done && done.error === "video-not-uploaded") return json({ error: UPLOADING("note"), code: done.error }, 409, me.cookies);
  if ("error" in done) return done.error === "too-big" ? json({ error: TOO_BIG }, 413, me.cookies) : json({ error: NO_NOTE }, 400, me.cookies);
  return json({ share: { id: done.id, createdAt: now.toISOString() } }, 200, me.cookies);
}

/** The signed-in person's live links of one item: ?kind=note|plan&item=<note, studio or a plan id>. Answers { shares: [{ id, createdAt }] }. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind");
  const item = q.get("item");
  if ((kind !== "note" && kind !== "plan") || !item || item.length > 100) return json({ error: "Send ?kind=note|plan&item=…" }, 400, me.cookies);
  return json({ shares: await liveLinks(store.repo, me.account.id, kind, item) }, 200, me.cookies);
}
