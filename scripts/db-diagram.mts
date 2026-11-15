/**
 * Draws the database schema: src/lib/db/schema.ts → docs/db/schema.dbml (drizzle-dbml-generator), then
 * docs/db/schema.svg (dbml-renderer). Run `npm run db:diagram` after changing the schema and commit both files.
 * The .dbml also pastes into https://dbdiagram.io for an editable view.
 */
import { mkdirSync } from "node:fs";
import { pgGenerate } from "drizzle-dbml-generator";

// Node runs the .ts schema itself (type stripping); a static import of a .ts path would fail tsc.
const schema = await import(new URL("../src/lib/db/schema.ts", import.meta.url).href);
const dir = "docs/db";
mkdirSync(dir, { recursive: true });
pgGenerate({ schema, out: `${dir}/schema.dbml`, relational: false });
console.log(`wrote ${dir}/schema.dbml`);
