import { test } from "node:test";
import assert from "node:assert/strict";
import { isMarketingPath, isPublicPath, loginHref } from "./publicPaths";

const PUBLIC = [
  "/", "/players", "/faq", "/demo", "/demo/guitar-beginner", "/login", "/login/confirm", "/account/setup",
  "/kickstarter", "/landing-1", "/intro", "/teachers/video/render", "/api/auth/session", "/_next/static/x.js",
  "/favicon.ico", "/icon.png", "/logo.png", "/opengraph-image", "/theory/scales/opengraph-image", "/robots.txt",
  "/sitemap.xml", "/instruments/piano/a.mp3", "/images/teacher.webp",
];
const GATED = [
  "/plan", "/practice", "/theory/scales", "/tuner", "/looper", "/course/1", "/note/x", "/account", "/teachers/studio",
  "/players-x", "/demox", "/dev", "/cheatsheet",
];

test("marketing pages, sign-in, demos, APIs and files are public", () => {
  for (const p of PUBLIC) assert.equal(isPublicPath(p), true, p);
});

test("the app needs a login", () => {
  for (const p of GATED) assert.equal(isPublicPath(p), false, p);
});

test("marketing paths are the public pages a visitor reads, not files or APIs", () => {
  for (const p of ["/", "/players", "/faq", "/demo", "/demo/voice-beginner", "/login", "/account/setup", "/kickstarter", "/landing-1", "/intro"]) assert.equal(isMarketingPath(p), true, p);
  for (const p of ["/plan", "/practice", "/api/auth/session", "/teachers/video/render", "/account"]) assert.equal(isMarketingPath(p), false, p);
});

test("the login link carries where to come back to", () => {
  assert.equal(loginHref("/plan?day=2"), "/login?next=%2Fplan%3Fday%3D2");
  assert.equal(loginHref("/practice"), "/login?next=%2Fpractice");
});

test("files in public/ with no extension and Vercel's own paths are public", () => {
  for (const p of ["/models/crepe/group1-shard1of1", "/models/crepe/model.json", "/videos/x", "/intro/scene1", "/_vercel/insights/view", "/_vercel/insights/event"]) assert.equal(isPublicPath(p), true, p);
});
