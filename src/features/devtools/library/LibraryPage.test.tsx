import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import type { BlockSummary } from "@/features/library/server/types";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { BlocksTable, ChoicesTable, PlansTable } from "./LibraryPage";

test("the seed plans table lists each file with a link to draw it, and marks an older version behind", () => {
  const f = SEED_PLANS[0];
  const html = renderToStaticMarkup(
    <PlansTable
      params={{}}
      plans={[{ ...f, versions: { prompt: PROMPT_VERSION - 1, agents: DOC_VERSIONS.agents, teaching: DOC_VERSIONS.teaching } }]}
    />,
  );
  assert.match(html, new RegExp(`href="/admin/content/library/plans\\?item=${f.id}"`));
  assert.equal(html.match(/\(behind\)/g)?.length, 1);
  assert.match(html, new RegExp(`written to ${PROMPT_VERSION - 1}, now ${PROMPT_VERSION} \\(behind\\)[^"]*".*?>prompt</span><span[^>]*>${PROMPT_VERSION - 1}/${PROMPT_VERSION}<`));
});

test("a block's choices are listed with level, steps, minutes and active; the drawn one is marked, the others link to themselves", () => {
  const choices = [
    { id: "a-block/easy", name: "easy", level: "beginner", steps: ["picking:1"], moves: null, minutes: 5, active: true },
    { id: "a-block/hard", name: "hard", level: null, steps: [], moves: null, minutes: 8, active: false },
  ];
  const html = renderToStaticMarkup(<ChoicesTable choices={choices} drawn="a-block/easy" params={{ item: "a-block" }} />);
  assert.match(html, /<span class="font-semibold text-slate-100">easy<\/span>/);
  assert.match(html, /href="\/admin\/content\/library\/blocks\?item=a-block%2Fhard">hard</);
  assert.match(html, />beginner<.*>picking:1<.*>5<.*>active</);
  assert.match(html, />–<.*>–<.*>8<.*>inactive</);
});

test("the blocks table tags a curated seed block and lists its choices", () => {
  const b = { id: "guitar-beginner-down-up-picking", title: "Down and up", level: "beginner", concepts: [], provenance: { model: null, promptVersion: null, docsAgents: null, docsTeaching: null }, use: { times: 0, seconds: 0, stars: [0, 0, 0, 0, 0] }, choices: [{ id: "guitar-beginner-down-up-picking/beginner", name: "beginner", level: "beginner", steps: ["picking:2"], minutes: 6, active: true }] } as unknown as BlockSummary;
  const html = renderToStaticMarkup(<BlocksTable blocks={[b]} params={{}} />);
  assert.equal(html.match(/>Seed</g)?.length, 1);
  assert.match(html, /item=guitar-beginner-down-up-picking%2Fbeginner">beginner</);
});

const summary = (id: string, choices: { id: string; active: boolean }[]) =>
  ({ id, title: id, level: null, concepts: [], provenance: { model: null, promptVersion: null, docsAgents: null, docsTeaching: null }, use: { times: 0, seconds: 0, stars: [0, 0, 0, 0, 0] }, choices: choices.map((c) => ({ ...c, name: "n", level: null, steps: [], moves: null, minutes: 5 })) }) as unknown as BlockSummary;

test("a seed block with no active choice is Seed and Off", () => {
  const html = renderToStaticMarkup(<BlocksTable blocks={[summary("guitar-beginner-down-up-picking", [{ id: "guitar-beginner-down-up-picking/beginner", active: false }])]} params={{}} />);
  assert.equal(html.match(/>Seed</g)?.length, 1);
  assert.equal(html.match(/>Off</g)?.length, 1);
  assert.equal(html.match(/>Database only</g)?.length ?? 0, 0);
});

test("a hashed block is Database only", () => {
  const html = renderToStaticMarkup(<BlocksTable blocks={[summary("abc123hash", [])]} params={{}} />);
  assert.equal(html.match(/>Database only</g)?.length, 1);
  assert.equal(html.match(/>Seed</g)?.length ?? 0, 0);
  assert.equal(html.match(/>Off</g)?.length ?? 0, 0);
});

test("a plan row shows Seed and never Off", () => {
  const html = renderToStaticMarkup(<PlansTable plans={[SEED_PLANS[0]]} params={{}} />);
  assert.equal(html.match(/>Seed</g)?.length, 1);
  assert.equal(html.match(/>Off</g)?.length ?? 0, 0);
});

test("a plan a demo shows is tagged Demo with a link to its page; one no demo shows is not", () => {
  const demo = SEED_PLANS.find((p) => p.id === "voice-guitar-advanced-first-week")!;
  const other = SEED_PLANS.find((p) => p.id === "theory-only-first-week")!;
  assert.match(renderToStaticMarkup(<PlansTable plans={[demo]} params={{}} />), /href="\/demo\/voice-guitar-advanced"[^>]*>Demo</);
  assert.equal(renderToStaticMarkup(<PlansTable plans={[other]} params={{}} />).match(/>Demo</g)?.length ?? 0, 0);
});

test("the open plan is drawn in the row under its own, and its title closes it", () => {
  const [a, b] = SEED_PLANS;
  const html = renderToStaticMarkup(<PlansTable plans={[a, b]} params={{ item: a.id }} open={<p>OPENED</p>} />);
  assert.equal(html.match(/OPENED/g)?.length, 1);
  assert.ok(html.indexOf("OPENED") < html.indexOf(`item=${b.id}`), "the open row sits under the first plan, before the second");
  assert.match(html, /aria-expanded="true" [^>]*href="\/admin\/content\/library\/plans"/);
});

test("a choice id opens its block's row", () => {
  const b = summary("guitar-beginner-down-up-picking", [{ id: "guitar-beginner-down-up-picking/beginner", active: true }]);
  const html = renderToStaticMarkup(<BlocksTable blocks={[b, summary("other", [])]} params={{ item: "guitar-beginner-down-up-picking/beginner" }} open={<p>OPENED</p>} />);
  assert.equal(html.match(/OPENED/g)?.length, 1);
  assert.match(html, /<tr id="item"/);
});
