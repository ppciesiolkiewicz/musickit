import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import type { PlanSummary } from "@/features/library/server/types";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { PlansTable } from "./LibraryPage";

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
