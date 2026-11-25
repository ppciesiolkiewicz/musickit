import { test } from "node:test";
import assert from "node:assert/strict";
import { movedPath } from "./moves";

test("old admin pages move", () => {
  assert.equal(movedPath("/admin/users"), "/admin/admin/users");
  assert.equal(movedPath("/admin"), "/admin");
  assert.equal(movedPath("/admin/usersx"), "/admin/usersx");
  assert.equal(movedPath("/dev/messages"), "/admin/admin/messages");
  assert.equal(movedPath("/admin/messages#x"), "/admin/admin/messages#x");
});
