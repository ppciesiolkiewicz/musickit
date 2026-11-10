"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AccountStore } from "./AccountStore";
import { can as canUse, type Account, type Feature } from "./model";
import { serverAccountStore } from "./serverAccountStore";

/** The store every page gets: the real session. With no session cookie it asks the server nothing, so a visitor costs no request. */
const StoreContext = createContext<AccountStore>(serverAccountStore);

/** Swap the store for a subtree (a test double). */
export function AccountStoreProvider({ store, children }: { store: AccountStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The store behind `useAccount`, for the screens that sign out. */
export const useAccountStore = (): AccountStore => useContext(StoreContext);

/**
 * Who is using the app. `account` is null when nobody is signed in: the local person, who may use everything
 * (see `can` in model.ts). `can("aiPlan")` is the one question a screen asks before showing a role's feature.
 * Until `loaded`, nobody is signed in, the same as on the server.
 */
export function useAccount() {
  const store = useContext(StoreContext);
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    store.current().then((a) => {
      if (!live) return;
      setAccount(a);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [store]);

  const can = useCallback((feature: Feature) => canUse(account, feature), [account]);

  return { account, loaded, can };
}
