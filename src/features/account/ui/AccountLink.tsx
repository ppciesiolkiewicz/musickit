"use client";

import Link from "next/link";
import { accountsOpen } from "../serverAccountStore";
import { useAccount } from "../useAccount";

/**
 * The account corner of the top nav: "Log in" for a visitor, the person's name (to /account) when logged in.
 * Nothing at all on a site without accounts, and nothing until we know who is here, so the bar never shows the wrong one.
 */
export default function AccountLink({ className = "" }: { className?: string }) {
  const { account, loaded } = useAccount();
  if (!loaded || (!account && !accountsOpen())) return null;
  return (
    <Link
      href={account ? "/account" : "/login"}
      className={`max-w-[9rem] truncate rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:text-sm ${className}`}
    >
      {account ? account.name : "Log in"}
    </Link>
  );
}
