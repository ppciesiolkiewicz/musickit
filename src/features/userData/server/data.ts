import { cleanEntries, type ProgressEntry } from "@/features/progress/log";
import { isDocKind, maxDocBytes, parseDoc, type DocKind } from "../model";
import type { UserDataRepo } from "./repo";

/** The player's document of this kind, parsed; the kind's empty value when none is stored. */
export async function readDoc(repo: UserDataRepo, userId: string, kind: DocKind): Promise<unknown> {
  return parseDoc(kind, await repo.getDoc(userId, kind));
}

/** Parses before storing, so a stored document is always safe to read back. Over its kind's cap (`maxDocBytes`) it is too big. */
export async function writeDoc(repo: UserDataRepo, userId: string, kind: string, raw: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: "too-big" | "bad-kind" }> {
  if (!isDocKind(kind)) return { ok: false, error: "bad-kind" };
  if ((JSON.stringify(raw) ?? "").length > maxDocBytes(kind)) return { ok: false, error: "too-big" };
  await repo.putDoc(userId, kind, parseDoc(kind, raw), now);
  return { ok: true };
}

/** Stores one progress entry (replacing the exercise's earlier one); false when it is broken. */
export async function putEntry(repo: UserDataRepo, userId: string, raw: unknown, now: Date): Promise<boolean> {
  const entry = cleanEntries([raw])[0];
  if (!entry) return false;
  await repo.putProgress(userId, entry, now);
  return true;
}

/** The player's progress log as stored, re-parsed the way documents are: broken rows dropped, one row per exercise. */
export async function readEntries(repo: UserDataRepo, userId: string): Promise<ProgressEntry[]> {
  return cleanEntries(await repo.listProgress(userId));
}
