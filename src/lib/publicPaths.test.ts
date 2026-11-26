import { test } from "node:test";
import assert from "node:assert/strict";
import { isMarketingPath, isPublicPath, loginHref } from "./publicPaths";

const PUBLIC = [
  "/", "/schools", "/faq", "/terms", "/privacy", "/demo", "/demo/guitar-beginner", "/login", "/login/confirm", "/claim",
  "/kickstarter", "/landing-1", "/intro", "/teachers/video/render", "/api/auth/session", "/_next/static/x.js",
  "/favicon.ico", "/icon.png", "/logo.png", "/opengraph-image", "/theory/scales/opengraph-image", "/robots.txt",
  "/sitemap.xml", "/instruments/piano/a.mp3", "/images/teacher.webp", "/admin/dev", "/admin/content/stories", "/admin", "/admin/messages",
];
const GATED = [
  "/plan", "/practice", "/theory/scales", "/tuner", "/looper", "/course/1", "/note/x", "/account", "/teachers/studio",
  "/schools-x", "/demox", "/dev", "/devx", "/adminx", "/cheatsheet", "/welcome", "/claimx",
];

test("marketing pages, sign-in, demos, APIs and files are public", () => {
  for (const p of PUBLIC) assert.equal(isPublicPath(p), true, p);
});

test("the app needs a login", () => {
  for (const p of GATED) assert.equal(isPublicPath(p), false, p);
});

test("marketing paths are the public pages a visitor reads, not files or APIs", () => {
  for (const p of ["/", "/schools", "/faq", "/terms", "/privacy", "/learn", "/learn/pitch-matching-exercises", "/about", "/demo", "/demo/voice-beginner", "/login", "/kickstarter", "/landing-1", "/intro", "/claim", "/reminders/off"]) assert.equal(isMarketingPath(p), true, p);
  for (const p of ["/plan", "/practice", "/api/auth/session", "/teachers/video/render", "/account"]) assert.equal(isMarketingPath(p), false, p);
});

test("the login link carries where to come back to", () => {
  assert.equal(loginHref("/plan?day=2"), "/login?next=%2Fplan%3Fday%3D2");
  assert.equal(loginHref("/practice"), "/login?next=%2Fpractice");
});

test("files in public/ with no extension and Vercel's own paths are public", () => {
  for (const p of ["/models/crepe/group1-shard1of1", "/models/crepe/model.json", "/videos/x", "/intro/scene1", "/_vercel/insights/view", "/_vercel/insights/event"]) assert.equal(isPublicPath(p), true, p);
});

test("a shared note's page is public; the notes creator and other notes pages are not", () => {
  assert.equal(isPublicPath("/notes/shared/abc"), true);
  assert.equal(isPublicPath("/notes/shared/abc_-123"), true);
  assert.equal(isPublicPath("/notes"), false);
  assert.equal(isPublicPath("/notes/sharedx"), false);
  assert.equal(isMarketingPath("/notes/shared/abc"), false);
});

test("a teacher invite is public: it logs the visitor in on the page", () => {
  assert.equal(isPublicPath("/join/abc_-1"), true);
  assert.equal(isPublicPath("/joinx"), false);
  assert.equal(isMarketingPath("/join/abc"), false);
});

test("a plan invite needs a login: it shows nothing of the plan before", () => {
  assert.equal(isPublicPath("/plan/invite/abc"), false);
});
