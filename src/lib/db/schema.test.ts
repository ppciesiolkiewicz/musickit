import assert from "node:assert/strict";
import { test } from "node:test";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema";

test("every table has row level security on, so Supabase's public Data API can't read or write it", () => {
  const tables = Object.values(schema).filter((value) => is(value, PgTable));
  assert.ok(tables.length > 0);
  const open = tables.map((table) => getTableConfig(table)).filter((config) => !config.enableRLS).map((config) => config.name);
  assert.deepEqual(open, [], "add .enableRLS() to these tables in schema.ts");
});
