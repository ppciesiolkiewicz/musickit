import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimLinkView, type ClaimState } from "./ClaimLink";
import { WelcomeView } from "./Welcome";

const draw = (state: ClaimState) => renderToStaticMarkup(<ClaimLinkView state={state} onClaim={() => {}} onRetry={() => {}} />);
const GONE = "This link is too old or was already used. If you have opened it before, press Log in. If not, ask your teacher to send a new link.";

test("a live link: whose account it is and one button, nothing spent yet", () => {
  const html = draw({ kind: "ready", name: "Ben", signedInAs: null, sending: false, error: null });
  assert.match(html, /This is Ben&#x27;s attunr account\./);
  assert.equal(html.match(/<button/g)?.length, 1);
  assert.match(html, />Log in as Ben</);
  assert.doesNotMatch(html, /logged in to/);
});

test("someone else logged in here: whose account they're in, said before the press", () => {
  const html = draw({ kind: "ready", name: "Ben", signedInAs: "Tess", sending: false, error: null });
  assert.match(html, /You&#x27;re logged in to Tess&#x27;s account in this browser\. Pressing Log in as Ben logs you out of it\./);
});

test("while the press is out the button waits; a failed press keeps the button with the line", () => {
  assert.match(draw({ kind: "ready", name: "Ben", signedInAs: null, sending: true, error: null }), /disabled=""[^>]*>Logging you in…</);
  const failed = draw({ kind: "ready", name: "Ben", signedInAs: null, sending: false, error: "attunr can't reach the server." });
  assert.match(failed, /role="alert"/);
  assert.match(failed, />Log in as Ben</);
});

test("a dead link: the route's line and Log in, nothing else to press", () => {
  const html = draw({ kind: "gone", error: GONE });
  assert.ok(html.includes(GONE.replace(/'/g, "&#x27;")));
  assert.match(html, /href="\/login\?next=%2Fplan"[^>]*>Log in</);
  assert.doesNotMatch(html, /<button/);
});

test("a check that failed: its line and Try again", () => {
  const html = draw({ kind: "failed", error: "attunr can't reach the server." });
  assert.match(html, />Try again</);
  assert.match(draw({ kind: "loading" }), /Checking the link…/);
});

test("the welcome page greets the student by name, with one link to the plan", () => {
  const html = renderToStaticMarkup(<WelcomeView name="Ben" />);
  assert.match(html, /Hello, Ben/);
  assert.equal(html.match(/<a /g)?.length, 1);
  assert.match(html, /href="\/plan"[^>]*>Open your practice plan</);
  assert.match(renderToStaticMarkup(<WelcomeView name={null} />), /Loading…/);
});
