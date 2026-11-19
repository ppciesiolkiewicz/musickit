import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import type { BlockSummary, PlanSummary } from "@/features/library/server/types";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { BlocksTable, ChoicesTable, PlansTable } from "./LibraryPage";

const row = (id: string, provenance: PlanSummary["provenance"]) =>
  ({ id, title: id, days: 7, provenance }) as unknown as PlanSummary;

test("a seed plan gets a Seed tag and an older version is marked behind", () => {
  const html = renderToStaticMarkup(
    <PlansTable
      params={{ includeNotEnabled: false }}
      plans={[
        row(SEED_PLANS[0].id, { model: null, promptVersion: PROMPT_VERSION - 1, docsAgents: DOC_VERSIONS.agents, docsTeaching: null }),
        row("ai-plan", { model: null, promptVersion: PROMPT_VERSION, docsAgents: DOC_VERSIONS.agents, docsTeaching: DOC_VERSIONS.teaching }),
      ]}
    />,
  );
  assert.equal(html.match(/>Seed</g)?.length, 1);
  assert.equal(html.match(/behind: now/g)?.length, 1);
  assert.match(html, new RegExp(`title="behind: now ${PROMPT_VERSION}">prompt ${PROMPT_VERSION - 1}<`));
  assert.match(html, /text-slate-500">teaching –</);
});

test("a block's choices are listed with level, steps, minutes and active; the drawn one is marked, the others link to themselves", () => {
  const choices = [
    { id: "a-block/easy", name: "easy", level: "beginner", steps: ["picking:1"], moves: null, minutes: 5, active: true },
    { id: "a-block/hard", name: "hard", level: null, steps: [], moves: null, minutes: 8, active: false },
  ];
  const html = renderToStaticMarkup(<ChoicesTable choices={choices} drawn="a-block/easy" params={{ includeNotEnabled: false, item: "a-block" }} />);
  assert.match(html, /<span class="font-semibold text-slate-100">easy<\/span>/);
  assert.match(html, /href="\/dev\/library\?item=a-block%2Fhard#item">hard</);
  assert.match(html, />beginner<.*>picking:1<.*>5<.*>active</);
  assert.match(html, />–<.*>–<.*>8<.*>inactive</);
});

test("the blocks table tags a curated seed block and lists its choices", () => {
  const b = { id: "guitar-beginner-down-up-picking", title: "Down and up", level: "beginner", concepts: [], provenance: { model: null, promptVersion: null, docsAgents: null, docsTeaching: null }, use: { times: 0, seconds: 0, stars: [0, 0, 0, 0, 0] }, choices: [{ id: "guitar-beginner-down-up-picking/beginner", name: "beginner", level: "beginner", steps: ["picking:2"], minutes: 6, active: true }] } as unknown as BlockSummary;
  const html = renderToStaticMarkup(<BlocksTable blocks={[b]} params={{ includeNotEnabled: false }} />);
  assert.equal(html.match(/>Seed</g)?.length, 1);
  assert.match(html, /item=guitar-beginner-down-up-picking%2Fbeginner#item">beginner</);
});
