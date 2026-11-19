# Admin: rules

- **Development, or an admin.** `src/app/admin/layout.tsx` calls `notFound()` unless `devOrAdminPage()`, and every
  `src/app/api/admin/*` handler starts with `await devOrAdminGate(req)` (`src/features/devtools/server/access.ts`): open
  to anyone in development (no login: `/admin` is a public path, `src/lib/publicPaths.ts`), and in production only to a
  signed-in account with role `admin`; everyone else gets a 404. The check is on the page and on every route; hiding a
  link is not a check.
- **What goes here, what goes in `/dev`.** Admin is for running the app: reading and answering what players send, and
  later their accounts. `/dev` is for building it: the prompt, the library, the code. A page that changes a player's
  data in the database is admin.
- **Imports.** Admin pages may import a feature's `server/` and `model/` code through route files, like any page.
  Nothing outside this folder, `src/app/admin` and `src/app/api/admin` imports admin code. Admin imports nothing from
  `src/features/devtools` except `gate.ts` and `server/access.ts`.
- **A new page** is one entry in `registry.ts` and one page under `src/app/admin`; the index and the tabs
  (`AdminNav.tsx`) both read the registry.
- `/admin` is not in the sitemap and robots.txt disallows it. The chat bubble is hidden there
  (`src/features/messages/model/placement.ts`).
