# Admin: rules

- **Development, or the permission.** `src/app/admin/layout.tsx` calls `notFound()` unless
  `permissionPage(["admin", "content"])` (the hub, `/admin`, opens to either); `src/app/admin/admin/layout.tsx` unless
  `permissionPage("admin")`; `src/app/admin/content/layout.tsx` unless `permissionPage("content")`. Three gates: the hub
  to either, each half to its own. Every `src/app/api/admin/*` handler starts with `await permissionGate(req, "admin")` (the users route uses `permissionCheck(req, "admin")`, the same test with the answer in hand)
  (`src/features/devtools/server/access.ts`): open
  to anyone in development (no login: `/admin` is a public path, `src/lib/publicPaths.ts`), and in production only to a
  signed-in account with the `admin` permission; everyone else gets a 404. The check is on the page and on every route; hiding a
  link is not a check.
- **What goes here, what goes in `/dev`.** `/admin/admin` is for running the app: reading and answering what players send, and
  later their accounts. `/admin/content` is for writing and recording lessons: the library, the path, the riff maker, the
  video studio. `/dev` is for building it: the prompt, the player data, the code. A page that changes a player's
  data in the database is admin.
- **Imports.** Admin pages may import a feature's `server/` and `model/` code through route files, like any page.
  Nothing outside this folder, `src/app/admin` and `src/app/api/admin` imports admin code. Admin imports nothing from
  `src/features/devtools` except `gate.ts` and `server/access.ts`. The exception is `src/app/admin/content`: the content
  tools are dev tools that moved there (`src/features/devtools`, `CONTENT_TOOLS`), so its pages import from devtools and
  nothing from this folder.
- **A new page** is one entry in `registry.ts` and one page under `src/app/admin/admin`; the index and the tabs
  (`AdminNav.tsx`) both read the registry. The tabs' links to the content and dev tools show only when the viewer may
  open them (`AdminShell` passes `openPermissions()`).
- `/admin` is not in the sitemap and robots.txt disallows it. The chat bubble is hidden there
  (`src/features/messages/model/placement.ts`).
