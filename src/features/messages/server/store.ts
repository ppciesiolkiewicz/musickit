import { getDb } from "@/lib/db/client";
import { drizzleMessagesRepo } from "./repo.drizzle";
import type { MessagesRepo } from "./repo";

/** Messages over the database, or null when the site has none. */
export function messagesStore(env: Record<string, string | undefined> = process.env): { repo: MessagesRepo } | null {
  const db = getDb(env);
  return db ? { repo: drizzleMessagesRepo(db) } : null;
}
