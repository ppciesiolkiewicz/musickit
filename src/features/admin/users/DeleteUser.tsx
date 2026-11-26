"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, toast } from "@/components/ui";
import type { UserFootprint } from "@/features/account/server/repo";
import { deleteLines } from "./deleteLines";
import { DELETE_FAILED, deleteMessage, LOAD_FAILED } from "./messages";

const BTN = "inline-flex cursor-pointer items-center rounded-lg border px-3 py-1 text-xs font-medium disabled:cursor-default disabled:opacity-50";

async function call(url: string, method: "GET" | "DELETE", fallback: string): Promise<{ footprint?: UserFootprint }> {
  let res: Response;
  try {
    res = await fetch(url, { method, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error(fallback);
  }
  const body = (await res.json().catch(() => ({}))) as { footprint?: UserFootprint; error?: string };
  if (!res.ok) throw new Error(deleteMessage(body.error, fallback));
  return body;
}

/**
 * Delete on a row of /admin/admin/users: opens a question that lists what goes with the account (`GET
 * /api/admin/users/<id>`), and deletes it all on Delete account (`DELETE`), then reloads the list. Not on your own row.
 */
export default function DeleteUser({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [footprint, setFootprint] = useState<UserFootprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/admin/users/${encodeURIComponent(userId)}`;

  async function start() {
    setOpen(true);
    setFootprint(null);
    setError(null);
    setBusy(true);
    try {
      setFootprint((await call(url, "GET", LOAD_FAILED)).footprint ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await call(url, "DELETE", DELETE_FAILED);
      setOpen(false);
      toast(`Deleted ${name}'s account.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : DELETE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const lines = footprint ? deleteLines(footprint) : null;
  return (
    <>
      <button type="button" onClick={() => void start()} className={`${BTN} border-slate-700 text-slate-400 hover:border-rose-500/60 hover:text-rose-200`}>Delete</button>
      {open && (
        <Modal title={`Delete ${name}'s account?`} narrow onClose={() => !busy && setOpen(false)}>
          {!lines && busy && <p className="text-sm text-slate-400">Loading what would be deleted…</p>}
          {lines && (
            <div className="space-y-3 text-sm text-slate-300">
              <p>This deletes everything below. It can&apos;t be undone.</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {lines.gone.map((l) => <li key={l}>{l}</li>)}
              </ul>
              {lines.kept.length > 0 && (
                <>
                  <p className="text-slate-400">What stays:</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-slate-400">
                    {lines.kept.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </>
              )}
              {lines.warning && <p role="alert" className="rounded-lg border border-amber-500/40 px-3 py-2 text-amber-200">{lines.warning}</p>}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className={`${BTN} border-slate-700 text-slate-300 hover:bg-slate-800`}>Keep account</button>
            <button type="button" disabled={busy || !lines} onClick={() => void remove()} className={`${BTN} border-rose-500/60 text-rose-100 hover:bg-rose-950`}>{busy && lines ? "Deleting…" : "Delete account"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
