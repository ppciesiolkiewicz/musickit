import fs from "node:fs";
import path from "node:path";
import { extractDocs } from "../src/features/exercises/docs/extract";

const root = path.join(process.cwd(), "src/features/exercises");
const files = (fs.readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith(".props.ts"));
const docs = files.flatMap((f) => extractDocs(fs.readFileSync(path.join(root, f), "utf8"))).sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(root, "docs/docs.generated.json"), JSON.stringify(docs, null, 2) + "\n");
console.log(`wrote ${docs.length} component docs`);
