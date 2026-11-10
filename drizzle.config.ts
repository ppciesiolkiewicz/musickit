import { defineConfig } from "drizzle-kit";

/** `npm run db:generate` writes SQL migrations from src/lib/db/schema.ts into /drizzle; `npm run db:migrate` applies them to DATABASE_URL. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://musickit:musickit@localhost:5433/musickit" },
});
