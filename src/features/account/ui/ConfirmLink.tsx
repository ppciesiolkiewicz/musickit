"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card, ErrorLine, LINK, errorOf, send } from "./parts";

/**
 * /login/confirm: where the mailed link lands. The page spends the token from the browser, not the link itself:
 * mail programs fetch links to scan them, and a plain fetch runs no script, so it can't use the link up.
 */
export default function ConfirmLink({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(token ? null : "This link is not complete. Open the link in the email again, or ask for a new one.");
  // once only: the token works once, and React runs effects twice in development
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    void send("/api/auth/email-link/confirm", "POST", { token }).then((r) => {
      if (r.ok && typeof r.body.redirect === "string") return window.location.assign(r.body.redirect);
      setError(errorOf(r));
    });
  }, [token]);

  return (
    <Card>
      {!error && <p role="status" className="text-sm text-slate-300">Logging you in…</p>}
      <ErrorLine>{error}</ErrorLine>
      {error && <Link className={`${LINK} text-sm`} href="/login">Get a new link</Link>}
    </Card>
  );
}
