import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStructure, packageOf, renderTree, resolveImport, routes, usersOf } from "./structure";

const SRC: Record<string, string> = {
  "src/app/plan/page.tsx": `import PlanPage from "@/features/plan/PlanPage";\nexport default function Page() { return <PlanPage />; }`,
  "src/features/plan/PlanPage.tsx": `"use client";\nimport { Button } from "@/components/ui";\nimport * as Cards from "./cards";\nimport type { Base } from "@/lib/base";\nexport interface PlanProps extends Base { id: string }\nfunction Row() { return <Button />; }\nexport default function PlanPage() { return <div><Row /><Row /><Cards.Card /><PlanPage /></div>; }`,
  "src/features/plan/cards.tsx": `export const Card = () => <span />;`,
  "src/features/plan/cards.test.ts": `import { Card } from "./cards";`,
  "src/components/ui/index.ts": `export { Button } from "./Button";\nexport * from "./Badge";`,
  "src/components/ui/Button.tsx": `import { util } from "@/features/plan/cards";\nexport function Button() { return <button />; }`,
  "src/components/ui/Badge.tsx": `export function Badge() { return null; }`,
  "src/lib/base.ts": `export interface Base { a: 1 }\nconst load = () => import("./other");`,
  "src/lib/other.ts": `export const x = 1;`,
};

test("packageOf: features, libs, component folders and loose files", () => {
  assert.deepEqual(packageOf("src/features/plan/model/x.ts"), { pkg: "features/plan", layer: "features", folder: "model" });
  assert.deepEqual(packageOf("src/lib/site.ts"), { pkg: "lib", layer: "lib", folder: "" });
  assert.deepEqual(packageOf("src/components/Modal.tsx"), { pkg: "components", layer: "components", folder: "" });
  assert.deepEqual(packageOf("src/app/theory/chords/page.tsx"), { pkg: "app", layer: "app", folder: "theory/chords" });
});

test("resolveImport: alias, relative, index files; packages are left out", () => {
  const known = new Set(["src/a/b.ts", "src/a/c/index.tsx"]);
  assert.equal(resolveImport("src/a/x.ts", "./b", known), "src/a/b.ts");
  assert.equal(resolveImport("src/a/d/x.ts", "../c", known), "src/a/c/index.tsx");
  assert.equal(resolveImport("src/z.ts", "@/a/b", known), "src/a/b.ts");
  assert.equal(resolveImport("src/z.ts", "react", known), undefined);
});

test("buildStructure: renders follow barrels and namespaces; local components point to their own file", () => {
  const s = buildStructure(SRC);
  assert.equal(s.files.some((f) => f.path.endsWith(".test.ts")), false);
  const plan = s.files.find((f) => f.path === "src/features/plan/PlanPage.tsx")!;
  assert.equal(plan.client, true);
  assert.equal(plan.kind, "component");
  assert.deepEqual(plan.components, ["Row", "PlanPage"]);
  assert.deepEqual(plan.renders, [
    { tag: "Button", file: "src/components/ui/Button.tsx", count: 1 },
    { tag: "Row", file: "src/features/plan/PlanPage.tsx", count: 2 },
    { tag: "Cards.Card", file: "src/features/plan/cards.tsx", count: 1 },
    { tag: "PlanPage", file: "src/features/plan/PlanPage.tsx", count: 1 },
  ]);
  assert.deepEqual(plan.extends, [{ name: "PlanProps", base: "Base", file: "src/lib/base.ts" }]);
  assert.deepEqual(s.files.find((f) => f.path === "src/lib/base.ts")!.imports, ["src/lib/other.ts"], "dynamic import counts");
});

test("buildStructure: package edges and imports that point up a layer", () => {
  const s = buildStructure(SRC);
  const ui = s.packages.find((p) => p.id === "components/ui")!;
  assert.deepEqual(ui.dependsOn, { "features/plan": 1 });
  assert.deepEqual(ui.usedBy, { "features/plan": 1 });
  assert.deepEqual(s.packages.map((p) => p.id), ["app", "features/plan", "components/ui", "lib"]);
  assert.deepEqual(s.upward, [{ from: "src/components/ui/Button.tsx", to: "src/features/plan/cards.tsx" }]);
});

test("renderTree, usersOf, routes", () => {
  const s = buildStructure(SRC);
  const tree = renderTree(s, "src/app/plan/page.tsx");
  assert.equal(tree.children[0].file, "src/features/plan/PlanPage.tsx");
  assert.deepEqual(tree.children[0].children.map((c) => c.file), ["src/components/ui/Button.tsx", "src/features/plan/cards.tsx"]);
  assert.equal(renderTree(s, "src/app/plan/page.tsx", 1).children[0].cut, "depth");
  assert.deepEqual(usersOf(s, "src/lib/base.ts"), {
    importedBy: ["src/features/plan/PlanPage.tsx"],
    renderedBy: [],
    extendedBy: [{ file: "src/features/plan/PlanPage.tsx", name: "PlanProps", base: "Base" }],
  });
  assert.deepEqual(routes(s), [{ url: "/plan", file: "src/app/plan/page.tsx" }]);
});
