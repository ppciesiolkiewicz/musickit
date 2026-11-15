"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath, loginHref } from "@/lib/publicPaths";
import { SETUP_PATH, sendToLogin, setupHref, stashHash, takeHash } from "../loginGuard";
import { accountsOpen, hasSessionHint } from "../serverAccountStore";
import { useAccount } from "../useAccount";

/**
 * The client half of the login wall (the proxy is the other): sends a person with no account to log in when the proxy
 * couldn't tell (a stale session cookie), and an account with no plan yet to /account/setup from every other app page
 * (it goes on to the page afterwards). Keeps the hash across
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
      if (!sendToLogin(false, hasSessionHint())) return;
      if (store) stashHash(store, path, hash, Date.now());
      window.location.replace(loginHref(path + search));
      return;
    }
    if (account.needsSetup) {
      if (path !== SETUP_PATH) window.location.replace(setupHref(path + search + hash));
      return;
    }
    const kept = !hash && store ? takeHash(store, path, Date.now()) : null;
    // a reload, not a hash change: a page may read its hash only once, on load
    if (kept) {
      window.history.replaceState(null, "", path + search + kept);
      window.location.reload();
    }
  }, [loaded, account, path]);

  return null;
}
