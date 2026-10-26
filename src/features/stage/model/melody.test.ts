import { test } from "node:test";
import assert from "node:assert/strict";
import { melodyDesignWidth } from "./melody";

test("a melody's design width grows with the beats across it, 10 by default", () => {
  assert.equal(melodyDesignWidth(), melodyDesignWidth(10));
  assert.ok(melodyDesignWidth(6) < melodyDesignWidth(10));
  assert.equal(melodyDesignWidth(7) - melodyDesignWidth(6), 64);
});
