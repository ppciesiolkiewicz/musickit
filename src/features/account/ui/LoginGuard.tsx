"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath, loginHref } from "@/lib/publicPaths";
import { stashHash, takeHash } from "../loginGuard";
import { accountsOpen } from "../serverAccountStore";
import { useAccount } from "../useAccount";

/**
 * The client half of the login wall (the proxy is the other): sends a person with no account to log in when the proxy
 * couldn't tell (a stale session cookie, or the notes creator, whose shared note sits in the hash). Keeps the hash across
 * logging in and puts it back after. Renders nothing. Mounted once in the root layout.
 */
export default function LoginGuard() {
  const path = usePathname();
  const { account, loaded } = useAccount();

  useEffect(() => {
    if (!loaded || !accountsOpen() || isPublicPath(path)) return;
    const { search, hash } = window.location;
    let store: Storage | null = null;
    try {
      store = window.localStorage;
    } catch {}
    if (!account) {
      if (store) stashHash(store, path, hash, Date.now());
      window.location.replace(loginHref(path + search));
      return;
    }
    const kept = !hash && store ? takeHash(store, path, Date.now()) : null;
    // a reload, not a hash change: the notes creator reads its note from the address once, on load
    if (kept) {
      window.history.replaceState(null, "", path + search + kept);
      window.location.reload();
    }
  }, [loaded, account, path]);

  return null;
}
