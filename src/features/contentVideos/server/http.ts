import { getDb } from "@/lib/db/client";
import { drizzleContentVideoRepo } from "./repo.drizzle";
import type { ContentVideoRepo } from "./repo";

/** The content videos over the database, or null when the site has none. */
export function contentVideos(env: Record<string, string | undefined> = process.env): { repo: ContentVideoRepo } | null {
  const db = getDb(env);
  return db ? { repo: drizzleContentVideoRepo(db) } : null;
}
