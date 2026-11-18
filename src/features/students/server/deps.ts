import { auth } from "@/features/account/server/http";
import { sendMail } from "@/features/account/server/mail";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import { userData } from "@/features/userData/server/http";
import { getDb } from "@/lib/db/client";
import type { StudentsHttpDeps } from "./http";

/** The real deps of the students routes, or null when the site has no database. */
export function studentsHttp(): StudentsHttpDeps | null {
  const a = auth();
  const store = userData();
  const db = getDb();
  if (!a || !store || !db) return null;
  return { auth: a, userData: store.repo, library: drizzleLibraryRepo(db), sendMail, newId: () => crypto.randomUUID(), env: process.env };
}
