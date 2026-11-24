import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudentRow } from "../model/types";
import { StudentsView, addedLine, addedLook, type Access, type ListState, type LinkState } from "./StudentsApp";
import { WhoStep, addSteps, emptyDraft, placeError } from "./AddStudent";

const ann: StudentRow = { id: "a1", name: "Ann", email: "ann@school.com", addedAt: "2026-11-10T10:00:00.000Z", claimedAt: null };
const ben: StudentRow = { id: "b2", name: "Ben", email: "ben@school.com", addedAt: "2026-11-01T10:00:00.000Z", claimedAt: "2026-11-03T12:00:00.000Z" };

const view = (list: ListState, { access = "teacher", links = {} }: { access?: Access; links?: Record<string, LinkState> } = {}) =>
  renderToStaticMarkup(<StudentsView access={access} list={list} added={null} links={links} onRetry={() => {}} onAdd={() => {}} onSendLink={() => {}} />);

const buttons = (html: string) => [...html.matchAll(/<button[^>]*>.*?<\/button>/g)].map((m) => m[0]);
const addButton = (html: string) => buttons(html).find((b) => b.includes("Add a student"));

test("no students: one line and the Add a student button, which works", () => {
  const html = view({ kind: "list", students: [], limit: null, extra: 0, active: 0, activeIds: [] });
  assert.match(html, /No students yet\./);
  assert.equal(html.match(/<p /g)?.length, 1, "one line");
  const add = addButton(html);
  assert.ok(add, "the Add a student button");
  assert.doesNotMatch(add!, / disabled=""/);
  assert.doesNotMatch(html, /of \d+ students/, "no count without a limit");
});

test("the list: name links to the student's page, email, opened or not, Send the link again only for an unopened link", () => {
  const html = view({ kind: "list", students: [ann, ben], limit: 5, extra: 2, active: 1, activeIds: ["b2"] });
  assert.match(html, /href="\/students\/a1"[^>]*>Ann</);
  assert.equal(html.match(/Active this month/g)?.length, 1, "only Ben is tagged active");
  assert.ok(html.indexOf("Active this month") > html.indexOf(">Ben<"), "the tag sits on Ben's row");
  assert.match(html, /href="\/students\/b2"[^>]*>Ben</);
  assert.match(html, /ann@school\.com/);
  assert.match(html, /Not opened yet/);
  assert.match(html, /Opened the link on 3 November/);
  assert.equal(html.match(/Send the link again/g)?.length, 1);
  assert.match(html, /1 of 5 active students/);
  assert.match(html, /What counts as an active student/, "the (i) beside the count");
  assert.doesNotMatch(html, /on us|That&#x27;s your plan/, "no notice under the limit");
  assert.doesNotMatch(addButton(html)!, / disabled=""/);
});

test("at the limit and in the extras: Add a student still works, the notice says how many are on us, with the two ways on", () => {
  const at = view({ kind: "list", students: [ann, ben], limit: 2, extra: 2, active: 2, activeIds: [] });
  assert.doesNotMatch(addButton(at)!, / disabled=""/);
  assert.match(at, /2 of 2 active students/);
  assert.match(at, /You&#x27;ve given plans to the 2 students your plan covers this month\. 2 more are on us, so carry on\./);
  assert.match(at, /href="\/account"[^>]*>Change your plan</);
  assert.match(at, /href="\/feedback"[^>]*>Send feedback</);
  const extras = view({ kind: "list", students: [ann, ben], limit: 2, extra: 2, active: 3, activeIds: [] });
  assert.match(extras, /3 of 2 active students/);
  assert.match(extras, /1 extra student left this month, on us\./);
});

test("limit and extras used: Add a student is disabled and the notice says what still works and what to do", () => {
  const html = view({ kind: "list", students: [ann, ben], limit: 2, extra: 0, active: 2, activeIds: [] });
  assert.match(addButton(html)!, / disabled=""/);
  assert.match(html, /That&#x27;s your plan&#x27;s 2 students for this month\. Students you already gave a plan this month can still get their next week\./);
  assert.match(html, /href="\/account"[^>]*>Change your plan</);
});

test("a failed list load shows the error and Try again", () => {
  const html = view({ kind: "error", error: "attunr can't reach the server. Check your connection, then try again." });
  assert.match(html, /can&#x27;t reach the server/);
  assert.ok(buttons(html).some((b) => b.includes("Try again")));
  assert.equal(addButton(html), undefined, "no Add while the list is unknown");
});

test("an account without students gets a line and a link to /account, not a blank page; no accounts gets its line", () => {
  const html = view({ kind: "loading" }, { access: "not-teacher" });
  assert.match(html, /Only a teacher&#x27;s account can have students/);
  assert.match(html, /href="\/account"[^>]*>Change your plan</);
  assert.match(view({ kind: "loading" }, { access: "no-accounts" }), /needs a teacher&#x27;s account/);
});

test("a row's Send the link again answer shows under the student; while it goes out the button is disabled", () => {
  const html = view({ kind: "list", students: [ann], limit: null, extra: 0, active: 0, activeIds: [] }, { links: { a1: { busy: false, ok: false, text: "A link went out a moment ago." } } });
  assert.match(html, /A link went out a moment ago\./);
  const busy = view({ kind: "list", students: [ann], limit: null, extra: 0, active: 0, activeIds: [] }, { links: { a1: { busy: true } } });
  assert.match(buttons(busy).find((b) => b.includes("Send the link again"))!, / disabled=""/);
});

test("an exists answer shows its line under the email field and keeps what was typed", () => {
  const text = "Someone already has an account with that email address. Use another address for your student.";
  const error = placeError("exists", text);
  assert.equal(error.field, "email");
  const draft = { ...emptyDraft(), name: "Ann Lee", email: "ann@school.com" };
  const html = renderToStaticMarkup(<WhoStep draft={draft} error={error} onName={() => {}} onEmail={() => {}} />);
  assert.match(html, /value="Ann Lee"/);
  assert.match(html, /value="ann@school.com"/);
  const email = html.indexOf('value="ann@school.com"');
  assert.ok(html.indexOf("already has an account") > email, "the line is under the email field");
  assert.match(html, /aria-invalid="true"/);
});

test("the add flow: name and email first, required before the questions; then the questions worded for a student; then Add", () => {
  const steps = addSteps(emptyDraft(), () => {}, null, false);
  assert.equal(steps[0].canNext, false, "nothing typed: no Next");
  assert.equal(addSteps({ ...emptyDraft(), name: "Ann", email: "ann@" }, () => {}, null, false)[0].canNext, false, "a half email: no Next");
  assert.equal(addSteps({ ...emptyDraft(), name: "Ann", email: "ann@school.com" }, () => {}, null, false)[0].canNext, true);
  assert.equal(steps[1].title, "What does your student play?");
  assert.equal(steps[2].title, "Guitar: where is your student now?");
  assert.equal(steps[2].canNext, false, "a topic screen needs one answer for a student");
  assert.equal(steps[steps.length - 2].title, "Which days does your student practise?", "the practice days come before Add");
  const last = steps[steps.length - 1];
  const errorText = "Your plan has no places left for students.";
  const failed = addSteps({ ...emptyDraft(), name: "Ann", email: "ann@school.com" }, () => {}, placeError("limit", errorText), false);
  assert.match(renderToStaticMarkup(<>{failed[failed.length - 1].body}</>), /no places left/);
  assert.match(String(last.title), /Add your student/);
});

test("the line after adding says what happened to the plan and the email, and what to do next", () => {
  const student = ann;
  assert.equal(addedLine({ student, plan: "made", mail: "sent" }), "Ann has a plan for their first week. attunr emailed ann@school.com a link to log in.");
  assert.equal(addedLine({ student, plan: "none", mail: "failed" }), "attunr couldn't make a plan for Ann's first week. Press Ann's name in the list below to open their page and make one. The email with the link didn't go out. Press Send the link again in Ann's row.");
  assert.match(addedLine({ student, plan: "short", mail: "off" }), /shorter than the minutes you picked.*no link went out/);
});

test("the line after adding warns when something needs the teacher; the check only when all went as meant", () => {
  assert.deepEqual(addedLook({ plan: "made", mail: "sent" }), { tone: "info", icon: "check" });
  assert.deepEqual(addedLook({ plan: "short", mail: "sent" }), { tone: "info", icon: "info" });
  for (const a of [{ plan: "none", mail: "sent" }, { plan: "made", mail: "failed" }, { plan: "made", mail: "off" }] as const) {
    assert.equal(addedLook(a).tone, "warn", `${a.plan} / ${a.mail}`);
  }
  const html = renderToStaticMarkup(<StudentsView access="teacher" list={{ kind: "list", students: [ann], limit: null, extra: 0, active: 0, activeIds: [] }} added={{ student: ann, plan: "none", mail: "failed" }} links={{}} onRetry={() => {}} onAdd={() => {}} onSendLink={() => {}} />);
  assert.match(html, /border-amber-500/, "the warning tone");
});
