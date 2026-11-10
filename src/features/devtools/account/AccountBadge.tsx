"use client";

import Link from "next/link";
import { ROLE_LABEL } from "@/features/account/model";
import { useAccount } from "@/features/account/useAccount";

/** Dev only, bottom left of every page (above Next's own dev button) while an account is logged in: who it is, linking to /dev/account. Nothing when nobody is. */
export default function AccountBadge() {
  const { account } = useAccount();
  if (!account) return null;
  return (
    <Link
      href="/dev/account"
      className="fixed bottom-14 left-3 z-[2000] max-w-[60vw] truncate rounded-lg border border-sky-500/40 bg-slate-950/90 px-2.5 py-1 text-xs text-sky-100 shadow-lg hover:border-sky-400"
    >
      Logged in as {account.name} · {ROLE_LABEL[account.role]}
    </Link>
  );
}
