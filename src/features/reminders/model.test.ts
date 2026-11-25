import { test } from "node:test";
import assert from "node:assert/strict";
import { QUARTER_TIMES, cleanSettings, dueOn, localNow, type Reminder } from "./model";

test("QUARTER_TIMES: 96 quarter hours", () => {
  assert.equal(QUARTER_TIMES.length, 96);
  assert.equal(QUARTER_TIMES[0], "00:00");
  assert.equal(QUARTER_TIMES[95], "23:45");
});

test("cleanSettings: a quarter-hour time and a real zone, or null", () => {
  assert.deepEqual(cleanSettings({ enabled: true, time: "07:45", zone: "Europe/Warsaw" }), { enabled: true, time: "07:45", zone: "Europe/Warsaw" });
  for (const bad of [{ time: "07:40" }, { time: "7:45" }, { time: "24:00" }, { zone: "Mars/Base" }, { zone: "" }, { enabled: "yes" }])
    assert.equal(cleanSettings({ enabled: true, time: "07:45", zone: "UTC", ...bad }), null, JSON.stringify(bad));
});

test("localNow: across midnight and a DST change", () => {
  assert.deepEqual(localNow(new Date("2026-11-18T05:00:00Z"), "Pacific/Auckland"), { date: "2026-11-18", hhmm: "18:00" });
  assert.deepEqual(localNow(new Date("2026-11-18T23:30:00Z"), "Europe/Warsaw"), { date: "2026-11-19", hhmm: "00:30" });
  assert.equal(localNow(new Date("2026-03-29T00:30:00Z"), "Europe/Warsaw").hhmm, "01:30");
  assert.equal(localNow(new Date("2026-03-29T01:30:00Z"), "Europe/Warsaw").hhmm, "03:30");
});

test("dueOn: at the time or within 15 minutes of it, once a day", () => {
  const r: Reminder = { enabled: true, time: "18:00", zone: "UTC", sentOn: null };
  const at = (t: string) => new Date(`2026-11-18T${t}:00Z`);
  assert.equal(dueOn(r, at("17:59")), null);
  assert.equal(dueOn(r, at("18:00")), "2026-11-18");
  assert.equal(dueOn(r, at("18:14")), "2026-11-18");
  assert.equal(dueOn(r, at("18:15")), null);
  assert.equal(dueOn({ ...r, sentOn: "2026-11-18" }, at("18:05")), null);
  assert.equal(dueOn({ ...r, sentOn: "2026-11-17" }, at("18:05")), "2026-11-18");
  assert.equal(dueOn({ ...r, enabled: false }, at("18:05")), null);
});

test("dueOn: never late, past midnight either; in the player's zone", () => {
  const r: Reminder = { enabled: true, time: "23:45", zone: "UTC", sentOn: null };
  assert.equal(dueOn(r, new Date("2026-11-18T23:59:00Z")), "2026-11-18");
  assert.equal(dueOn(r, new Date("2026-11-19T00:00:00Z")), null);
  // 18:00 in Warsaw (UTC+1 in winter) is 17:00 UTC
  const w: Reminder = { enabled: true, time: "18:00", zone: "Europe/Warsaw", sentOn: null };
  assert.equal(dueOn(w, new Date("2026-11-18T17:00:00Z")), "2026-11-18");
  assert.equal(dueOn(w, new Date("2026-11-18T18:00:00Z")), null);
});
