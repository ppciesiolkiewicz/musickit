# Admin: rules

- **Dev only, for now.** `src/app/admin/layout.tsx` calls `notFound()` in a production build, for everyone, and every
  `src/app/api/admin/*` handler starts with `devGate()` (`src/features/devtools/gate.ts`). In development no login is
  needed: `/admin` is a public path (`src/lib/publicPaths.ts`). Before any of it opens in production it needs a real
  check of who is asking, on the page and on every route; hiding a link is not a check.
- **What goes here, what goes in `/dev`.** Admin is for running the app: reading and answering what players send, and
  later their accounts. `/dev` is for building it: the prompt, the library, the code. A page that changes a player's
  data in the database is admin.
- **Imports.** Admin pages may import a feature's `server/` and `model/` code through route files, like any page.
  Nothing outside this folder, `src/app/admin` and `src/app/api/admin` imports admin code. Admin imports nothing from
  `src/features/devtools` except `gate.ts`.
- **A new page** is one entry in `registry.ts` and one page under `src/app/admin`; the index and the tabs
  (`AdminNav.tsx`) both read the registry.
- `/admin` is not in the sitemap and robots.txt disallows it. The chat bubble is hidden there
  (`src/features/messages/model/placement.ts`).
