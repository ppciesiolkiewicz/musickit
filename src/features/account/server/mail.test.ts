import { test } from "node:test";
import assert from "node:assert/strict";
import { MAIL_TRIES, linkEmail, sendMail } from "./mail";

const env = { RESEND_API_KEY: "key" };
const mail = linkEmail("ann@school.com", "https://attunr.app/login/confirm?token=t", "123456", env);

/** A fetch that answers each call from the list, and records the Idempotency-Key it was sent. */
function fakeFetch(answers: (number | Error)[]) {
  const keys: string[] = [];
  const fetcher = (async (_url: string, init: RequestInit) => {
    keys.push((init.headers as Record<string, string>)["idempotency-key"]);
    const a = answers[keys.length - 1];
    if (a instanceof Error) throw a;
    return new Response("reason", { status: a });
  }) as unknown as typeof fetch;
  return { fetcher, keys };
}

test("sendMail: off without a key, sent on 200", async () => {
  assert.equal(await sendMail(mail, {}), "off");
  const f = fakeFetch([200]);
  assert.equal(await sendMail(mail, env, f.fetcher), "sent");
  assert.equal(f.keys.length, 1);
});

test("sendMail: a timeout or a 5xx is tried once more, with the same idempotency key", async () => {
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  const f = fakeFetch([timeout, 200]);
  assert.equal(await sendMail(mail, env, f.fetcher), "sent");
  assert.equal(f.keys.length, 2);
  assert.equal(f.keys[0], f.keys[1]);

  const g = fakeFetch([503, 503, 503]);
  await assert.rejects(sendMail(mail, env, g.fetcher), /resend 503/);
  assert.equal(g.keys.length, MAIL_TRIES);
});

test("sendMail: a refused mail (4xx) is not tried again", async () => {
  const f = fakeFetch([422, 200]);
  await assert.rejects(sendMail(mail, env, f.fetcher), /resend 422: reason/);
  assert.equal(f.keys.length, 1);
});
