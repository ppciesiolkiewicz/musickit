import assert from "node:assert/strict";
import { test } from "node:test";
import { mayCount, mustAsk, parseChoice, parseRegion, regionOf, scrubUrl } from "./analyticsChoice";

test("the EU, the EEA and Switzerland are asked first; the UK, Australia, the US and an unknown country are counted", () => {
  for (const c of ["DE", "fr", "PL", "NO", "IS", "LI", "CH", " ie "]) assert.equal(regionOf(c), "ask", c);
  for (const c of ["GB", "AU", "US", "NZ", "", "XX", null, undefined]) assert.equal(regionOf(c), "count", String(c));
});

test("a cookie or a stored answer that isn't one of ours reads as the default", () => {
  assert.equal(parseRegion("ask"), "ask");
  assert.equal(parseRegion("DE"), "count");
  assert.equal(parseRegion(undefined), "count");
  assert.equal(parseChoice("on"), "on");
  assert.equal(parseChoice("off"), "off");
  assert.equal(parseChoice("yes"), null);
});

test("their own answer wins, then Global Privacy Control, then the region", () => {
  assert.equal(mayCount({ region: "count", choice: null, gpc: false }), true);
  assert.equal(mayCount({ region: "ask", choice: null, gpc: false }), false);
  assert.equal(mayCount({ region: "count", choice: null, gpc: true }), false);
  assert.equal(mayCount({ region: "count", choice: "off", gpc: false }), false);
  assert.equal(mayCount({ region: "ask", choice: "on", gpc: false }), true);
  assert.equal(mayCount({ region: "ask", choice: "on", gpc: true }), true);
});

test("only a visitor who is asked first, has not answered and sends no Global Privacy Control is asked", () => {
  assert.equal(mustAsk({ region: "ask", choice: null, gpc: false }), true);
  assert.equal(mustAsk({ region: "ask", choice: "off", gpc: false }), false);
  assert.equal(mustAsk({ region: "ask", choice: null, gpc: true }), false);
  assert.equal(mustAsk({ region: "count", choice: null, gpc: false }), false);
});

test("an invite, a shared note's id and a log-in token never reach the count", () => {
  assert.equal(scrubUrl("https://www.attunr.app/join/abc123XYZ"), "https://www.attunr.app/join/[token]");
  assert.equal(scrubUrl("/join/abc123?x=1"), "/join/[token]?x=1");
  assert.equal(scrubUrl("/notes/shared/n_9f2#top"), "/notes/shared/[id]#top");
  assert.equal(scrubUrl("https://www.attunr.app/claim?token=secret&next=%2Fplan"), "https://www.attunr.app/claim?token=[removed]&next=%2Fplan");
  assert.equal(scrubUrl("/login/confirm?token=secret"), "/login/confirm?token=[removed]");
  assert.equal(scrubUrl("/api/auth/google/callback?state=s&code=4/abc"), "/api/auth/google/callback?state=s&code=[removed]");
  assert.equal(scrubUrl("/plan?day=3"), "/plan?day=3");
});
