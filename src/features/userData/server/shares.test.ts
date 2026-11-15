import { test } from "node:test";
import assert from "node:assert/strict";
import type { Account, Role } from "@/features/account/model";
import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import { readDoc } from "./data";
import { memoryUserDataRepo } from "./repo.memory";
import type { UserDataRepo, VideoRow } from "./repo";
import { MAX_DOC_BYTES } from "../model";
import { claimInvite, liveLinks, openNoteShare, readNoteShare, shareNote, shareNoteBlock, sharePlan, videoIdsIn } from "./shares";

const ANN = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CAL = "33333333-3333-4333-8333-333333333333";
const V1 = "0b8a5c9e-3f1d-4a2b-9c7e-1d2f3a4b5c6d";
const V2 = "7e6d5c4b-3a2f-4e1d-8c9b-0a1b2c3d4e5f";
const V3 = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NOW = new Date(2026, 10, 15, 12);
const LATER = new Date(2026, 10, 16, 9);

const account = (id: string, role: Role): Account => ({ id, name: "N", email: `${id}@x.org`, role, createdAt: NOW.toISOString(), needsSetup: false });
const ann = account(ANN, "teacher");
const ben = account(BEN, "student");
const cal = account(CAL, "student");

/** Ids handed out in order: "s1", "s2"… for shares, "p1", "p2"… for plans and exercises. */
const ids = (prefix: string) => {
  let n = 0;
  return () => `${prefix}${++n}`;
};

const video = (id: string, userId: string): VideoRow => ({ id, userId, title: "Take", type: "video/webm", seconds: 10, width: 640, height: 360, size: 100, blobPath: `videos/${userId}/${id}.webm`, createdAt: NOW });
const rec = (id: string) => ({ type: "tool", id: `c-${id}`, tool: { type: "video", ref: { source: "recording", id, title: "Take" } } });
const note = (...videoIds: string[]) => ({ title: "Scales", cells: [{ type: "text", id: "t", text: "Play it slow." }, ...videoIds.map(rec)] });

const config = (videoId: string) => ({
  title: "Week 1",
  progress: "Ann: shapes C and A are solid.",
  days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ id: `e${i}`, title: "Ex", minutes: 5, cells: i === 0 ? [rec(videoId)] : [{ type: "text", id: "t", text: "x" }] }] })),
});
const plan = (id: string, videoId = V2, extra: Partial<StoredPlan> = {}) => ({ id, config: config(videoId), startedOn: "2026-11-01", done: { "0:0": true }, rated: {}, feedback: "Hard week.", ...extra });

async function setup() {
  const repo = memoryUserDataRepo();
  for (const [id, owner] of [[V1, ANN], [V2, ANN], [V3, BEN]] as const) assert.ok(await repo.createVideo(video(id, owner)));
  await repo.putDoc(ANN, "note", note(V1), NOW);
  await repo.putDoc(ANN, "plan", { current: plan("ann-plan"), history: [], answers: null, reminder: { enabled: false, time: "18:00" } }, NOW);
  return repo;
}

const planDoc = async (repo: UserDataRepo, userId: string) => (await readDoc(repo, userId, "plan")) as PlanState;
const copiesOf = (s: PlanState, shareId: string) => [s.current, ...s.history].filter((p) => p?.from === shareId);

test("videoIdsIn: finds recordings nested anywhere, once each, and skips library refs and placeholders", () => {
  const snap = {
    title: "x",
    cells: [
      rec(V1),
      { type: "section", cells: [{ type: "tool", tool: { type: "video", ref: { source: "recording", id: V2, title: "B" } } }, rec(V1)] },
      { type: "tool", tool: { type: "video", video: "lib-1" } },
      { ref: { source: "library", id: "lib-2" } },
      { ref: { source: "placeholder", text: "soon" } },
      { ref: { source: "recording", id: 7 } },
    ],
  };
  assert.deepEqual(videoIdsIn(snap).sort(), [V1, V2].sort());
  assert.deepEqual(videoIdsIn(null), []);
  assert.deepEqual(videoIdsIn("recording"), []);
});

test("a visitor can watch a video in a live note share, and not after it is stopped", async () => {
  const repo = await setup();
  const made = await shareNote(repo, ann, NOW, ids("s"));
  assert.ok("id" in made);
  assert.equal(made.id, "s1");
  assert.equal((await repo.canWatch(null, V1))?.id, V1);
  assert.equal((await repo.canWatch(BEN, V1))?.id, V1);
  const open = await openNoteShare(repo, "s1");
  assert.equal(open?.itemId, "note");
  assert.deepEqual(open?.snapshot, await readDoc(repo, ANN, "note"));
  assert.equal(await repo.stopShare(BEN, "s1", LATER), false, "only the owner stops a share");
  assert.equal((await repo.canWatch(null, V1))?.id, V1);
  assert.equal(await repo.stopShare(ANN, "s1", LATER), true);
  assert.equal(await repo.canWatch(null, V1), null);
  assert.equal(await repo.canWatch(BEN, V1), null);
  assert.equal(await openNoteShare(repo, "s1"), null);
  assert.equal((await repo.canWatch(ANN, V1))?.id, V1, "the owner always can");
});

test("a note share is frozen: a later edit of the note doesn't reach it", async () => {
  const repo = await setup();
  await shareNote(repo, ann, NOW, ids("s"));
  await repo.putDoc(ANN, "note", note(V2), LATER);
  assert.deepEqual(videoIdsIn((await openNoteShare(repo, "s1"))?.snapshot), [V1]);
  assert.equal(await repo.canWatch(null, V2), null);
});

test("a visitor can't watch a video that is in no share, and no one can watch another's video by its id", async () => {
  const repo = await setup();
  assert.equal(await repo.canWatch(null, V2), null);
  assert.equal(await repo.canWatch(BEN, V1), null);
  assert.equal(await repo.canWatch(ANN, V3), null);
  assert.equal(await repo.canWatch(null, "nope"), null);
});

test("a note naming someone else's video is not shared, and opens nothing of it", async () => {
  const repo = await setup();
  await repo.putDoc(ANN, "note", note(V1, V3), NOW);
  assert.deepEqual(await shareNote(repo, ann, NOW, ids("s")), { error: "video-not-uploaded" });
  assert.equal(await repo.getShare("s1"), null);
  assert.equal(await repo.canWatch(null, V3), null);
});

test("a share naming a take that isn't uploaded yet is refused (note, studio block and plan), and goes once it is up", async () => {
  const repo = memoryUserDataRepo();
  const take = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  await repo.putDoc(ANN, "note", note(take), NOW);
  assert.deepEqual(await shareNote(repo, ann, NOW, ids("s")), { error: "video-not-uploaded" });
  assert.deepEqual(await shareNoteBlock(repo, ann, note(take), NOW, ids("s")), { error: "video-not-uploaded" });
  await repo.putDoc(ANN, "plan", { current: plan("p1", take), history: [] }, NOW);
  assert.deepEqual(await sharePlan(repo, ann, NOW, ids("s")), { error: "video-not-uploaded" });
  assert.equal(await repo.getShare("s1"), null, "nothing is stored");
  await repo.createVideo(video(take, ANN));
  assert.deepEqual(await shareNote(repo, ann, NOW, ids("s")), { id: "s1" });
  assert.equal((await repo.canWatch(null, take))?.id, take);
});

test("shareNote: no note, or an empty one, is not shared", async () => {
  const repo = memoryUserDataRepo();
  assert.deepEqual(await shareNote(repo, ann, NOW, ids("s")), { error: "no-note" });
  await repo.putDoc(ANN, "note", { title: "  ", cells: [] }, NOW);
  assert.deepEqual(await shareNote(repo, ann, NOW, ids("s")), { error: "no-note" });
  assert.equal(await repo.getShare("s1"), null);
});

test("a plan share's video can't be watched through the note route", async () => {
  const repo = await setup();
  const made = await sharePlan(repo, ann, NOW, ids("s"));
  assert.deepEqual(made, { id: "s1" });
  assert.equal(await openNoteShare(repo, "s1"), null);
  assert.equal(await repo.canWatch(null, V2), null);
  assert.equal(await repo.canWatch(BEN, V2), null, "not before claiming");
  assert.equal(await openNoteShare(repo, "nope"), null);
});

test("sharePlan: a student is not allowed, and no current plan is no-plan", async () => {
  const repo = await setup();
  await repo.putDoc(BEN, "plan", { current: plan("ben-plan", V3) }, NOW);
  assert.deepEqual(await sharePlan(repo, ben, NOW, ids("s")), { error: "not-allowed" });
  assert.deepEqual(await sharePlan(repo, account(CAL, "owner"), NOW, ids("s")), { error: "no-plan" });
  assert.equal(await repo.getShare("s1"), null);
});

test("sharePlan: the snapshot is the current week only, without ticks, ratings, feedback or the AI's notes on the teacher", async () => {
  const repo = await setup();
  await sharePlan(repo, ann, NOW, ids("s"));
  const row = await repo.getShare("s1");
  assert.equal(row?.kind, "plan");
  assert.equal(row?.itemId, "ann-plan");
  assert.equal(row?.userId, ANN);
  assert.deepEqual(Object.keys(row?.snapshot as object), ["config"]);
  const shared = (row?.snapshot as { config: Record<string, unknown> }).config;
  assert.equal(shared.title, "Week 1");
  assert.equal("progress" in shared, false);
});

test("claimInvite twice gives one plan, and the claimer can watch the plan's video", async () => {
  const repo = await setup();
  await sharePlan(repo, ann, NOW, ids("s"));
  const first = await claimInvite(repo, ben, "s1", NOW, ids("p"));
  assert.deepEqual(first, { ok: true, planId: "p1" });
  const again = await claimInvite(repo, ben, "s1", LATER, ids("q"));
  assert.deepEqual(again, { ok: true, planId: "p1" });
  const s = await planDoc(repo, BEN);
  assert.equal(s.current?.id, "p1", "with no plan running, the copy becomes the current one");
  assert.equal(s.current?.from, "s1");
  assert.equal(s.current?.startedOn, "2026-11-15");
  assert.deepEqual(s.current?.done, {});
  assert.equal(s.current?.config.days[0].exercises[0].id === "e0", false, "the copy's exercises get new ids");
  assert.equal(s.history.length, 0);
  assert.equal((await repo.canWatch(BEN, V2))?.id, V2);
  assert.equal(await repo.canWatch(CAL, V2), null);
  assert.equal(await repo.canWatch(null, V2), null);
});

test("claimInvite: with a plan running, the copy goes to the front of the history and survives a full history", async () => {
  const repo = await setup();
  const history = Array.from({ length: 20 }, (_, i) => plan(`old-${i}`, V3));
  await repo.putDoc(BEN, "plan", { current: plan("ben-plan", V3), history }, NOW);
  await sharePlan(repo, ann, NOW, ids("s"));
  assert.deepEqual(await claimInvite(repo, ben, "s1", NOW, ids("p")), { ok: true, planId: "p1" });
  const s = await planDoc(repo, BEN);
  assert.equal(s.current?.id, "ben-plan");
  assert.equal(s.history[0].id, "p1");
  assert.equal(s.history[0].from, "s1");
  assert.equal(s.history.length, 20);
});

test("claimInvite again puts the copy back when another tab overwrote the plan document", async () => {
  const repo = await setup();
  await sharePlan(repo, ann, NOW, ids("s"));
  await claimInvite(repo, ben, "s1", NOW, ids("p"));
  await repo.putDoc(BEN, "plan", { current: plan("ben-plan", V3) }, LATER);
  const again = await claimInvite(repo, ben, "s1", LATER, ids("q"));
  assert.deepEqual(again, { ok: true, planId: "q1" });
  const s = await planDoc(repo, BEN);
  assert.equal(copiesOf(s, "s1").length, 1);
  assert.equal(s.history[0].id, "q1");
  assert.equal(s.current?.id, "ben-plan");
});

test("after stopShare a new claimer gets stopped, and the old claimer can still watch", async () => {
  const repo = await setup();
  await sharePlan(repo, ann, NOW, ids("s"));
  await claimInvite(repo, ben, "s1", NOW, ids("p"));
  assert.equal(await repo.stopShare(ANN, "s1", LATER), true);
  assert.deepEqual(await claimInvite(repo, cal, "s1", LATER, ids("p")), { error: "stopped" });
  assert.equal(copiesOf(await planDoc(repo, CAL), "s1").length, 0);
  assert.equal(await repo.canWatch(CAL, V2), null);
  assert.equal((await repo.canWatch(BEN, V2))?.id, V2);
  assert.equal(copiesOf(await planDoc(repo, BEN), "s1").length, 1);
});

test("claimInvite: an unknown id or a note share is not-found", async () => {
  const repo = await setup();
  await shareNote(repo, ann, NOW, ids("s"));
  assert.deepEqual(await claimInvite(repo, ben, "s1", NOW, ids("p")), { error: "not-found" });
  assert.deepEqual(await claimInvite(repo, ben, "nope", NOW, ids("p")), { error: "not-found" });
  assert.equal(await repo.getDoc(BEN, "plan"), null);
});

test("deleting a video makes canWatch null for the owner, a note visitor and a claimer", async () => {
  const repo = await setup();
  await repo.putDoc(ANN, "note", note(V1, V2), NOW);
  await shareNote(repo, ann, NOW, ids("s"));
  await sharePlan(repo, ann, NOW, ids("t"));
  await claimInvite(repo, ben, "t1", NOW, ids("p"));
  assert.equal((await repo.canWatch(null, V2))?.id, V2);
  assert.ok(await repo.deleteVideo(ANN, V2));
  for (const viewer of [ANN, BEN, null]) assert.equal(await repo.canWatch(viewer, V2), null);
  assert.equal((await repo.canWatch(null, V1))?.id, V1);
});

test("listShares: live shares of the item, never another user's", async () => {
  const repo = await setup();
  await repo.putDoc(BEN, "note", note(V3), NOW);
  await shareNote(repo, ann, NOW, ids("a"));
  await shareNote(repo, ann, LATER, ids("b"));
  await shareNote(repo, ben, NOW, ids("c"));
  await sharePlan(repo, ann, NOW, ids("d"));
  assert.deepEqual((await repo.listShares(ANN, "note", "note")).map((s) => s.id), ["b1", "a1"]);
  assert.deepEqual((await repo.listShares(BEN, "note", "note")).map((s) => s.id), ["c1"]);
  assert.deepEqual((await repo.listShares(ANN, "plan", "ann-plan")).map((s) => s.id), ["d1"]);
  assert.deepEqual(await repo.listShares(BEN, "plan", "ann-plan"), []);
  await repo.stopShare(ANN, "a1", LATER);
  assert.deepEqual((await repo.listShares(ANN, "note", "note")).map((s) => s.id), ["b1"]);
});

test("videoPaths: every video path of that user, none of another's; deleting the user then cascades their rows only", async () => {
  const repo = await setup();
  await repo.putDoc(BEN, "note", note(V3), NOW);
  await shareNote(repo, ann, NOW, ids("s"));
  await shareNote(repo, ben, NOW, ids("b"));
  await sharePlan(repo, ann, NOW, ids("t"));
  await claimInvite(repo, ben, "t1", NOW, ids("p"));
  const blobPaths = await repo.videoPaths(ANN);
  assert.equal((await repo.listVideos(ANN)).length, 2, "reading the paths deletes nothing");
  repo.cascadeUser(ANN);
  assert.deepEqual(blobPaths.sort(), [`videos/${ANN}/${V1}.webm`, `videos/${ANN}/${V2}.webm`].sort());
  assert.equal(await repo.getShare("s1"), null);
  assert.equal(await repo.canWatch(null, V1), null);
  assert.equal(await repo.canWatch(BEN, V2), null);
  assert.deepEqual(await repo.listVideos(ANN), []);
  assert.equal(await repo.getDoc(ANN, "note"), null);
  assert.equal((await repo.canWatch(null, V3))?.id, V3, "another user's share still works");
  assert.equal((await repo.listVideos(BEN)).length, 1);
});

test("shareNoteBlock: shares the block it is given as the studio's, and leaves the user's note document alone", async () => {
  const repo = await setup();
  const before = await repo.getDoc(ANN, "note");
  const r = await shareNoteBlock(repo, ann, { title: "", cells: [rec(V2)] }, NOW, ids("s"));
  assert.deepEqual(r, { id: "s1" });
  const row = await repo.getShare("s1");
  assert.equal(row?.kind, "note");
  assert.equal(row?.itemId, "studio");
  assert.deepEqual(await repo.getDoc(ANN, "note"), before);
  assert.equal((await repo.canWatch(null, V2))?.id, V2);
  assert.equal(await repo.canWatch(null, V1), null);
});

test("shareNoteBlock: an empty block or a broken one is no-note, too big a block is too-big, and nothing is stored", async () => {
  const repo = await setup();
  assert.deepEqual(await shareNoteBlock(repo, ann, { title: " ", cells: [] }, NOW, ids("s")), { error: "no-note" });
  assert.deepEqual(await shareNoteBlock(repo, ann, "not a note", NOW, ids("s")), { error: "no-note" });
  assert.deepEqual(await shareNoteBlock(repo, ann, null, NOW, ids("s")), { error: "no-note" });
  const big = { title: "x", cells: [{ type: "text", id: "t", text: "a".repeat(MAX_DOC_BYTES) }] };
  assert.deepEqual(await shareNoteBlock(repo, ann, big, NOW, ids("s")), { error: "too-big" });
  assert.equal(await repo.getShare("s1"), null);
});

test("shareNoteBlock: the block is parsed before it is stored", async () => {
  const repo = await setup();
  await shareNoteBlock(repo, ann, { title: "Scales", cells: [{ type: "text", id: "t", text: "Slow." }], junk: "x" }, NOW, ids("s"));
  const snap = (await repo.getShare("s1"))?.snapshot as Record<string, unknown>;
  assert.equal(snap.title, "Scales");
  assert.equal("junk" in snap, false);
});

test("readNoteShare: the note and its date for a live note link, never the owner; null when stopped, unknown or a plan", async () => {
  const repo = await setup();
  await shareNote(repo, ann, NOW, ids("s"));
  const open = await readNoteShare(repo, "s1");
  assert.deepEqual(Object.keys(open ?? {}).sort(), ["note", "sharedAt"]);
  assert.equal(open?.note.title, "Scales");
  assert.equal(open?.sharedAt, NOW.toISOString());
  assert.equal(JSON.stringify(open).includes(ANN), false);
  assert.equal(await readNoteShare(repo, "nope"), null);
  await sharePlan(repo, ann, NOW, () => "p1");
  assert.equal(await readNoteShare(repo, "p1"), null);
  assert.ok(await repo.stopShare(ANN, "s1", LATER));
  assert.equal(await readNoteShare(repo, "s1"), null);
});

test("liveLinks: the owner's live links of one item, newest first, with ids and dates only", async () => {
  const repo = await setup();
  await shareNote(repo, ann, NOW, () => "s1");
  await shareNote(repo, ann, LATER, () => "s2");
  await shareNoteBlock(repo, ann, note(), LATER, () => "s3");
  assert.deepEqual(await liveLinks(repo, ANN, "note", "note"), [
    { id: "s2", createdAt: LATER.toISOString() },
    { id: "s1", createdAt: NOW.toISOString() },
  ]);
  assert.deepEqual(await liveLinks(repo, ANN, "note", "studio"), [{ id: "s3", createdAt: LATER.toISOString() }]);
  assert.deepEqual(await liveLinks(repo, BEN, "note", "note"), []);
  await repo.stopShare(ANN, "s2", LATER);
  assert.deepEqual((await liveLinks(repo, ANN, "note", "note")).map((l) => l.id), ["s1"]);
});
