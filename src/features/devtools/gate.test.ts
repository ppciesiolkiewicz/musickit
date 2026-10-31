import { test } from "node:test";
import assert from "node:assert/strict";
import { devGate, devOnly } from "./gate";

test("dev tools are off in production only", () => {
  assert.equal(devOnly({ NODE_ENV: "production" }), false);
  assert.equal(devOnly({ NODE_ENV: "development" }), true);
  assert.equal(devOnly({}), true);
});

test("devGate answers 404 in production and lets dev through", () => {
  assert.equal(devGate({ NODE_ENV: "production" })?.status, 404);
  assert.equal(devGate({ NODE_ENV: "development" }), null);
});
