import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha256Hex } from "./sha256";

test("sha256Hex matches node:crypto", () => {
  for (const s of ["", "abc", "é♪😀 ünïcode", "x".repeat(55), "x".repeat(56), "x".repeat(64), "x".repeat(1_000_003)])
    assert.equal(sha256Hex(s), createHash("sha256").update(s, "utf8").digest("hex"));
});
