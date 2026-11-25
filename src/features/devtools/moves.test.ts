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

test("every move keeps the rest of the path", () => {
  assert.equal(movedPath("/dev/stories#group~2"), "/admin/content/stories#group~2");
  assert.equal(movedPath("/dev/library"), "/admin/content/library");
  assert.equal(movedPath("/dev/block?step=barre%3A2"), "/admin/content/block?step=barre%3A2");
  assert.equal(movedPath("/dev/path/x"), "/admin/content/path/x");
  for (const tool of ["library", "path", "stories", "onboarding", "riff", "studio", "notes", "block"]) {
    assert.equal(movedPath(`/dev/${tool}`), `/admin/content/${tool}`);
  }
});

test("the sampler and look-alikes stay", () => {
  assert.equal(movedPath("/dev/sampler"), "/dev/sampler");
  assert.equal(movedPath("/dev/libraryx"), "/dev/libraryx");
  assert.equal(movedPath("/admin/content/library"), "/admin/content/library");
  assert.equal(movedPath("/dev"), "/dev");
});
