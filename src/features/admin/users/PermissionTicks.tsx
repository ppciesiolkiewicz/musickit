"use client";

import { useState } from "react";
import { PERMISSION_LABEL, PERMISSIONS, type Permission } from "@/features/account/model";
import { failedMessage, SELF, thrownMessage } from "./messages";

/**
 * One person's permissions on /admin/admin/users: a box each for dev, content and admin, saved as soon as one changes
 * (`PATCH /api/admin/users`). A failed save puts the boxes back as stored and says so. `self` is the viewer's own row:
 * its Admin box can't be unticked (the server refuses it too).
 */
export default function PermissionTicks({ userId, initial, self }: { userId: string; initial: Permission[]; self: boolean }) {
  const [saved, setSaved] = useState<Permission[]>(initial);
  const [shown, setShown] = useState<Permission[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(p: Permission) {
    const next = shown.includes(p) ? shown.filter((x) => x !== p) : PERMISSIONS.filter((x) => x === p || shown.includes(x));
    setShown(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, permissions: next }),
      });
      const body = (await res.json().catch(() => ({}))) as { permissions?: Permission[]; error?: string };
      if (!res.ok || !body.permissions) throw new Error(failedMessage(body.error));
      setSaved(body.permissions);
      setShown(body.permissions);
    } catch (e) {
      setShown(saved);
      setError(thrownMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PERMISSIONS.map((p) => {
          const locked = self && p === "admin" && shown.includes("admin");
          return (
            <label key={p} className="flex items-center gap-1 text-slate-300" title={locked ? SELF : undefined}>
              <input type="checkbox" checked={shown.includes(p)} disabled={saving || locked} onChange={() => toggle(p)} className="accent-amber-400" />
              {PERMISSION_LABEL[p]}
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-amber-200">{error}</p>}
    </div>
  );
}
