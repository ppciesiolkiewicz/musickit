import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

type Env = Record<string, string | undefined>;

/** The Postgres address, or null when the site runs without a database (then there are no accounts). */
export const databaseUrl = (env: Env = process.env): string | null => env.DATABASE_URL?.trim() || null;

/** One pool per server process; kept on globalThis so a dev reload does not open a new one each time. */
const held = globalThis as unknown as { __musickitDb?: { url: string; db: Db } };

/** The database, or null when DATABASE_URL is not set. Server only. */
export function getDb(env: Env = process.env): Db | null {
  const url = databaseUrl(env);
  if (!url) return null;
  if (held.__musickitDb?.url !== url) {
    const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
    held.__musickitDb = { url, db: drizzle(client, { schema }) };
  }
  return held.__musickitDb.db;
}
