"use client";

import { useSyncExternalStore } from "react";
import { useAccount } from "@/features/account/useAccount";
import { accountsOpen } from "@/features/account/serverAccountStore";
import { pickSource, type DataSource } from "./source";
import { anyAccountChanged, anyTooBig, anyUnsaved, subscribeSaves, worstStatus, type SaveStatus } from "./registry";

/**
 * Which store a page should use. With accounts on, `ready` waits for the account to load, so nothing reads the wrong store
 * first. `accountId` is the signed-in account's id (null for anyone else), so a change of account is a change of data.
 */
export function useDataSource(): { source: DataSource; ready: boolean; accountId: string | null } {
  const { account, loaded } = useAccount();
  const on = accountsOpen();
  return { source: pickSource(on, account !== null), ready: !on || loaded, accountId: account?.id ?? null };
}

/** The worst status across every saving client on the page ("saved" on the server and before anything is saved). */
export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribeSaves, worstStatus, () => "saved");
}

/** Whether a refused save was refused as too big (413), for the notice's wording. */
export function useSaveTooBig(): boolean {
  return useSyncExternalStore(subscribeSaves, anyTooBig, () => false);
}

/** Whether a refused save was refused because another account logged in since the page loaded (409), for the notice's wording. */
export function useSaveAccountChanged(): boolean {
  return useSyncExternalStore(subscribeSaves, anyAccountChanged, () => false);
}

/** Whether some change would be lost by leaving the page (a refused load alone holds none): the leave warning. */
export function useUnsaved(): boolean {
  return useSyncExternalStore(subscribeSaves, anyUnsaved, () => false);
}
