import { test } from "node:test";
import assert from "node:assert/strict";
import { localTestDatabase } from "./testDatabase";

test("a local database whose name ends in _test is accepted, with its parts and a url rebuilt from them", () => {
  assert.deepEqual(localTestDatabase("postgres://musickit:musickit@localhost:5433/musickit_test"), {
    host: "localhost", port: 5433, database: "musickit_test", username: "musickit", password: "musickit",
    url: "postgres://musickit:musickit@localhost:5433/musickit_test",
  });
  assert.equal(localTestDatabase("postgres://u:p@127.0.0.1/x_test")?.port, 5432);
});

test("anything else is refused", () => {
  for (const url of [
    "postgres://u:p@db.example.com:5432/x_test",
    "postgres://u:p@localhost:5433/musickit",
    "postgres://u:p@localhost:5433/x_test?host=db.example.com",
    "postgres://u:p@localhost:5433/x_test?hostaddr=10.0.0.1",
    "postgres://u:p@localhost:5433/x_test?sslmode=disable",
    "postgres://u:p@localhost:5433/x_test?",
    "postgres://u:p@localhost:5433/x_test#frag",
    "http://localhost:5433/x_test",
    "not a url",
    "",
    undefined,
  ]) assert.equal(localTestDatabase(url), null, String(url));
});
