import { test } from "node:test";
import assert from "node:assert/strict";
import { startReminder } from "./defaults";
import { memoryReminderRepo } from "./repo.memory";

const now = new Date("2026-11-25T10:00:00Z");

test("a whole reminder from the form is saved as given", async () => {
  const repo = memoryReminderRepo();
  await startReminder(repo, "u", { enabled: false, time: "07:15", zone: "Europe/Warsaw" }, now);
  assert.deepEqual(await repo.get("u"), { enabled: false, time: "07:15", zone: "Europe/Warsaw", sentOn: null });
});

test("no reminder in the body: on at 18:00 in the zone given, else UTC", async () => {
  const repo = memoryReminderRepo();
  await startReminder(repo, "a", { zone: "America/New_York" }, now);
  await startReminder(repo, "b", undefined, now);
  await startReminder(repo, "c", { enabled: true, time: "07:10", zone: "nope" }, now);
  assert.deepEqual(await repo.get("a"), { enabled: true, time: "18:00", zone: "America/New_York", sentOn: null });
  assert.deepEqual(await repo.get("b"), { enabled: true, time: "18:00", zone: "UTC", sentOn: null });
  assert.deepEqual(await repo.get("c"), { enabled: true, time: "18:00", zone: "UTC", sentOn: null });
});

test("an account that already has a reminder keeps it", async () => {
  const repo = memoryReminderRepo();
  await repo.put("u", { enabled: false, time: "09:00", zone: "UTC" }, now);
  await startReminder(repo, "u", { enabled: true, time: "20:00", zone: "UTC" }, now);
  assert.deepEqual(await repo.get("u"), { enabled: false, time: "09:00", zone: "UTC", sentOn: null });
});
