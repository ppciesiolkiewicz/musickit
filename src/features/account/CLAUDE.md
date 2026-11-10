# Account: rules

- **Ask through `useAccount()`.** A screen that splits by role calls `can("<feature>")`; it never compares roles
  itself and never reads the account keys in localStorage. A new split is one entry in `FEATURES` (`model.ts`).
- **Nobody signed in can use everything.** `account: null` is every visitor in production. Don't make a page need an
  account, in development either.
- **Production reads no account.** `accountsOn()` is false in a production build, so `sessionId()` is null and
  `accountKey(base)` is `base`. A change must not move or rename a visitor's stored data.
- **Local data stores take their key from `accountKey`.** A store that should be per account wraps its key in it at
  each read and write (see `localPlanStore`, `localProgressStore`); logging in or out reloads the page, so nothing
  caches a key.
- **This folder imports no feature.** Plan, progress and dev tools import it. The log-in screen is a dev tool
  (`features/devtools/account`), not part of this folder.
