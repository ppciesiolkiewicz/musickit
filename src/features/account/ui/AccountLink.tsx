"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
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
      className={`flex h-8 max-w-[10rem] items-center gap-1.5 rounded-full border border-sky-500/45 bg-sky-500/15 pl-2.5 pr-3.5 text-sm font-medium text-sky-50 backdrop-blur transition hover:border-sky-400 hover:bg-sky-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${className}`}
    >
      <Icon name="circle-user-round" size={16} className="shrink-0 text-sky-300" />
      <span className="truncate">{account ? account.name : "Log in"}</span>
    </Link>
  );
}
