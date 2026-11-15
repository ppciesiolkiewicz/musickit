import { defineConfig } from "drizzle-kit";

/**
 * `npm run db:generate` writes SQL migrations from src/lib/db/schema.ts into /drizzle; `npm run db:migrate` applies them to DATABASE_URL.
 * `npm run db:studio` uses DATABASE_URL_FOR_DRIZZLE_STUDIO when set: Studio hangs on Supabase's transaction pooler (port 6543),
 * so point it at the session pooler (same URL, port 5432).
 */
const isStudio = process.argv.includes("studio");
const url = (isStudio && process.env.DATABASE_URL_FOR_DRIZZLE_STUDIO) || process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: url ?? "postgres://musickit:musickit@localhost:5433/musickit" },
});
