/*
 * The header with the id of the account this page loaded for, built in `features/account/serverAccountStore.ts` (the
 * account folder imports no feature, so it lives there and is re-exported here for the data clients).
 *
 * Every app client that writes (documents, progress, videos, shares, the claim, the account itself) sends it, so a tab
 * left open under one account can't write into another that logged in since: its saves are refused with 409
 * `account-changed` (`rejected`, no retry) and the notice asks for a reload.
 */
export { ACCOUNT_CHANGED_WORDS, ACCOUNT_HEADER, accountHeaders, isAccountChanged } from "@/features/account/serverAccountStore";
