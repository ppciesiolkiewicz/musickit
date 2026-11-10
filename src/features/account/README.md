# Account

Who is using the app, and what their role lets them use. This is the ground for user profiles: students, teachers and
owners. There is no real sign-in yet.

- `model.ts`: `Role` (student, teacher, owner; an owner runs a school and can do all a teacher can), `Account` (id,
  name, email, role), `FEATURES` (the parts of the app that belong to some roles: the notes creator and AI plans are
  for teachers and owners) and `can(account, feature)`. `makeAccount` and `cleanAccounts` check input and stored lists.
- `AccountStore.ts`: where accounts and the signed-in one are kept: `list`, `create`, `remove`, `current`, `signIn`,
  `signOut`, async so real sign-in can replace it.
- `localAccountStore.ts`: the store for development: accounts in localStorage (`musickit.dev.accounts`), the signed-in
  id in `musickit.dev.session`, no passwords. `accountsOn()` is false in a production build. `accountKey(base)` is the
  key a local data store uses: `base` when nobody is signed in, `base@<account id>` when somebody is.
- `useAccount.tsx`: `useAccount()` gives `{ account, loaded, can }`; `AccountStoreProvider` swaps the store.

## Two modes

- **Production**: no accounts and no log-in screen. `useAccount()` gives `account: null`, the local person, who can
  use everything. Data stays in the shared localStorage keys, as before.
- **Development**: `/dev/account` (`features/devtools/account`) makes accounts and logs in and out. Logging in is not
  needed: logged out, the app works as in production. Logged in, plans (`musickit.plan@<id>`) and the progress log
  (`musickit.progress@<id>`) are the account's own, and a badge at the bottom left of every page says who is logged in.
  Other settings in the browser (level, tours, tuner, theme) are shared by all accounts.

## Not here yet

- No screen asks `can` yet: every tool is open to every role.
- Which students a teacher has, giving a plan to a student, and the email that tells them are not modelled.
