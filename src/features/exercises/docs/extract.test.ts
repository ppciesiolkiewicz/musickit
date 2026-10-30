import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractDocs } from "./extract";
import { COMPONENT_DOCS } from "./index";

const src = `/** Shows a demo.\n *\n * Second paragraph.\n * @component demo basic */\nexport interface DemoProps {\n  /** a note: c, f-sharp */ key: string;\n  /** rest of notes */ others?: "dimmed" | "hidden";\n}\ninterface Untagged { a: string }`;

describe("extractDocs", () => {
  it("extracts tagged interfaces", () => {
    assert.deepEqual(extractDocs(src), [{ name: "demo", kind: "basic", description: "Shows a demo.\n\nSecond paragraph.", props: [
      { name: "key", type: "string", required: true, description: "a note: c, f-sharp" },
      { name: "others", type: '"dimmed" | "hidden"', required: false, description: "rest of notes" } ] }]);
  });
  it("throws on unknown kind naming the interface", () => {
    assert.throws(() => extractDocs("/** x\n * @component foo weird */\nexport interface BadProps { a: string }"), /BadProps/);
  });
  it("generated docs are current", () => {
    const root = path.join(process.cwd(), "src/features/exercises");
    const files = (fs.readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith(".props.ts"));
    const docs = files.flatMap((f) => extractDocs(fs.readFileSync(path.join(root, f), "utf8"))).sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(COMPONENT_DOCS, docs);
  });
});
