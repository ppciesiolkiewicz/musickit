"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ErrorLine, LINK, PRIMARY, errorOf, send } from "./parts";

/**
 * /login/confirm: where the mailed link lands. The link alone does nothing; pressing Continue spends it.
 * (Mail programs open links to scan them, which would use the link up before the person saw it.)
 */
export default function ConfirmLink({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This link is not complete. Open the link in the email again, or ask for a new one.");

  const confirm = async () => {
    setBusy(true);
    const r = await send("/api/auth/email-link/confirm", "POST", { token });
    if (r.ok && typeof r.body.redirect === "string") return window.location.assign(r.body.redirect);
    setBusy(false);
    setError(errorOf(r));
  };

  return (
    <Card>
      {!error && (
        <>
          <p className="text-sm text-slate-300">Your link is good. Press Continue to finish.</p>
          <button type="button" disabled={busy} onClick={() => void confirm()} className={PRIMARY}>
            {busy ? "One moment…" : "Continue"}
          </button>
        </>
      )}
      <ErrorLine>{error}</ErrorLine>
      {error && <Link className={`${LINK} text-sm`} href="/login">Get a new link</Link>}
    </Card>
  );
}
