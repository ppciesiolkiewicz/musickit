# ContentVideos1: Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split "what a person pays for" (`role`, from the plan) from "what a person may open" (a new `permissions`
list of `dev`, `content`, `admin`), move today's admin accounts over in one migration, gate /dev and /admin by
permission, and let an admin tick permissions per person on the users page.

**Architecture:** `Permission` and `hasPermission` live beside `Role` in `src/features/account/model.ts`; the `admin`
role leaves `ROLES` and the `user_role` enum. `users.permissions text[]` is carried through `UserRow` → `Account`.
`src/features/devtools/server/access.ts` swaps `devOrAdmin*` for permission-named gates (`permissionPage(p)`,
`permissionGate(req, p)`), still open to everyone in development. A pure `changePermissions` in the account server
code backs `PATCH /api/admin/users`, called by a small client tick component in the users table.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes/layouts), Drizzle ORM +
drizzle-kit 0.31, Postgres, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-25-content-videos-design.md`, section 1 (Permissions). Task line:
`tasks.txt` "ContentVideos1".

## Global Constraints

- Permissions are exactly `dev`, `content`, `admin`. None implies another.
- `role` keeps `student`, `teacher` from the plan (`roleOnPlan`); `owner` stays a role as today; only `admin` stops
  being a role.
- An account with the `admin` permission keeps every `FEATURES` entry (`can()` = role listed **or** `admin` permission).
- `dev` opens /dev and the `/api/dev/*` routes that call the gate today; `admin` opens /admin and `/api/admin/*`,
  including setting permissions. `content` gates nothing yet (ContentVideos2 uses it).
- In development every gate stays open, no login, as today.
- Data moves in one Drizzle migration, no separate script. Admin accounts get `{dev, content, admin}` and the role of
  their plan (`student` when they have no plan).
- A person cannot remove their own `admin` permission. Only `admin` may change permissions.
- The users page stays at `/admin/users` in this task; ContentVideos2 moves it to `/admin/admin/users`.
- Interface copy: load `design:ux-copy` and "Words about the app" in `teaching-voice` before writing a label; report
  strings old → new. No exclamation marks.
- Every fetch has a timeout (`AbortSignal.timeout(15_000)`, as `InvitesAdmin.tsx`) and every failure shows inline.
- **Migrations:** `.env.local`'s `DATABASE_URL` is the release Supabase DB. Run `db:migrate` only against the local
  Docker DB (`docker start musickit-db`, port 5433, user/password/db `musickit`) by passing its URL explicitly. Ask
  before applying to Supabase.
- **Commits:** straight to main, never `git add` in the shared checkout. Build each commit in a temp index
  (`GIT_INDEX_FILE=<scratchpad>/idx git read-tree HEAD`, add, `write-tree`, `commit-tree`, `update-ref`), then
  `git reset -q -- <files>`. Other sessions have uncommitted edits in `src/app/api/dev/nam/route.ts` and
  `src/features/devtools/README.md`: commit only your hunks of those (apply your diff to `HEAD`'s blob).
  Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done means: `npm test` for the touched features, `npx tsc --noEmit 2>&1 | grep -v '^.next/'` clean, eslint on changed
  files, and the users page read in the browser.

## Review Focus

1. **An admin with no plan** (`plan_id` null, still on /account/setup) is migrated: expected role `student`, all three
   permissions, not a failed migration. → Task 1, Step 6 check.
2. **An account from the session API with no `permissions` field** (a server mid-deploy, a cached body): expected
   `cleanAccounts` keeps it with `permissions: []`, not dropping the signed-in person. → Task 1 test
   `cleanAccounts gives an account without permissions an empty list`.
3. **Development with nobody signed in** ticks permissions on /admin/users: expected it saves (no actor, so no self
   rule), as the rest of /admin works without login. → Task 3 test `nobody signed in (development) may change anyone`.
4. **A body with an unknown permission, a duplicate or a non-array**: expected a 400 for unknown values or a
   non-array, duplicates folded, nothing written on a 400. → Task 3 test `unknown permissions are refused`.
5. **A save that fails or times out**: expected the tick goes back to what is stored and an error line shows under
   the row. → Task 3, Step 7 browser check (block the request in DevTools).

---

### Task 1: Permissions in the model, the database and the account

**Files:**
- Modify: `src/features/account/model.ts`, `src/features/account/plans.ts:101`
- Modify: `src/lib/db/schema.ts:17` (`userRole`), `:93-128` (`users`)
- Create: `drizzle/0044_permissions.sql` (+ `drizzle/meta` snapshot/journal from `db:generate`)
- Modify: `src/features/account/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `auth.ts:55` (`toAccount`)
- Modify: `scripts/db-seed.mjs`
- Modify: `src/features/admin/users/UsersTable.tsx` only if `ROLE_LABEL` typing breaks it
- Test: `src/features/account/model.test.ts`, `src/features/account/plans.test.ts`, `src/features/account/server/auth.test.ts`
- Docs: `src/features/account/README.md` (`model.ts` bullet: roles, permissions, `hasPermission`)

**Interfaces:**
- Produces (model.ts):
  - `PERMISSIONS = ["dev", "content", "admin"] as const`; `type Permission = (typeof PERMISSIONS)[number]`
  - `PERMISSION_LABEL: Record<Permission, string>` = `{ dev: "Dev", content: "Content", admin: "Admin" }`
  - `ROLES = ["student", "teacher", "owner"] as const` (no `admin`); `ROLE_LABEL` loses `admin`
  - `Account.permissions: Permission[]`
  - `hasPermission(account: Account | null, p: Permission): boolean` (null → false; reads `account.permissions ?? []`)
  - `cleanPermissions(raw: unknown): Permission[] | null`: null when `raw` isn't an array or holds an unknown value;
    otherwise the known values, deduped, in `PERMISSIONS` order
  - `isAdmin` is deleted.
- Produces (repo.ts): `UserRow.permissions: Permission[]`;
  `AuthRepo.setPermissions(userId: string, permissions: Permission[], now: Date): Promise<UserRow | null>`
  (sets `updated_at`; null when no such user)
- Produces (plans.ts): `roleOnPlan(role, plan)` keeps only `owner`; everyone else gets `plan.role`.

- [ ] **Step 1: Write the failing tests**

In `model.test.ts`, replace the `admin`-role cases with:

```ts
test("the admin permission opens every feature, whatever the role", () => {
  const a = acc({ role: "student", permissions: ["admin"] });
  for (const f of Object.keys(FEATURES) as Feature[]) assert.equal(can(a, f), true, f);
  assert.equal(can(acc({ role: "student", permissions: ["dev", "content"] }), "sharePlan"), false);
});

test("hasPermission reads the list and nothing else", () => {
  assert.equal(hasPermission(acc({ permissions: ["content"] }), "content"), true);
  assert.equal(hasPermission(acc({ permissions: ["admin"] }), "dev"), false); // none implies another
  assert.equal(hasPermission(null, "dev"), false);
});

test("cleanPermissions keeps known values once, in order, and refuses the rest", () => {
  assert.deepEqual(cleanPermissions(["admin", "dev", "admin"]), ["dev", "admin"]);
  assert.deepEqual(cleanPermissions([]), []);
  assert.equal(cleanPermissions(["owner"]), null);
  assert.equal(cleanPermissions("dev"), null);
});

test("cleanAccounts gives an account without permissions an empty list", () => {
  const { permissions: _, ...old } = acc({});
  assert.deepEqual(cleanAccounts([old])[0].permissions, []);
  assert.equal(cleanAccounts([{ ...old, role: "admin" }]).length, 0); // the role is gone
});
```

`acc` gains a `permissions: []` default. `homePage` case for `admin` goes. In `plans.test.ts`, the test
`a plan gives its role, but an owner and an admin keep theirs` becomes `a plan gives its role, but an owner keeps theirs`
(drop the two `admin` lines). In `auth.test.ts`, add `toAccount carries the permissions` (a `UserRow` with
`permissions: ["content"]` → `account.permissions` deep-equals `["content"]`) and
`setPermissions on the memory repo writes and returns the row` (and returns null for an unknown id).

- [ ] **Step 2: Run them to see them fail**

Run: `npx tsx --test src/features/account/*.test.ts src/features/account/server/*.test.ts`
Expected: FAIL (`hasPermission`/`cleanPermissions` not exported, `setPermissions` missing).

- [ ] **Step 3: Implement the model, repo and `toAccount`**

Model as in Interfaces; `FEATURES` lists drop `"admin"`; `can()` returns true for a null account (as now), else
role listed `|| hasPermission(account, "admin")`. `cleanAccounts` sets `permissions` to
`cleanPermissions(x.permissions) ?? []`. Update the file's header comment: role = what the plan gives,
permissions = what of /dev and /admin the person may open. `toAccount` copies `u.permissions`. Repos: `createUser`
starts with `[]`; drizzle `userCols` gains `permissions`; add `setPermissions` to both.

- [ ] **Step 4: Schema and migration**

`userRole` becomes `["student", "teacher", "owner"]` (comment: same values as `ROLES`). `users` gains
`permissions: text("permissions").array().notNull().default(sql\`'{}'::text[]\`)` with a doc comment and a table check
`users_permissions_known`: `${t.permissions} <@ array['dev','content','admin']::text[]`.

Run `npm run db:generate -- --name permissions`. drizzle-kit writes the column, the check, and the enum swap
(columns to `text`, drop and recreate `user_role`, columns back `USING ...::"public"."user_role"`) for
`users.role`, `plans.role`, `auth_tokens.role`. If it doesn't write the enum swap, write it by hand in that shape.
Then put the data move **after `ADD COLUMN` and before the first `SET DATA TYPE`**:

```sql
UPDATE "users" SET "permissions" = '{dev,content,admin}',
  "role" = COALESCE((SELECT "plans"."role" FROM "plans" WHERE "plans"."id" = "users"."plan_id"), 'student')
  WHERE "role" = 'admin';--> statement-breakpoint
UPDATE "auth_tokens" SET "role" = NULL WHERE "role" = 'admin';--> statement-breakpoint
```

- [ ] **Step 5: `scripts/db-seed.mjs`**

Roles accepted: `student`, `teacher`, `owner`, plus `admin` meaning "role student, permissions dev, content, admin".
A new `admin` row inserts with `role 'student'` and those permissions; an existing one gets
`permissions = '{dev,content,admin}'` and keeps its role. Header comment and `db:seed-admin` keep working unchanged.

- [ ] **Step 6: Migrate the local DB and check the data move**

```bash
docker start musickit-db
L=postgres://musickit:musickit@localhost:5433/musickit
docker exec musickit-db psql -U musickit -c "update users set role='admin', plan_id=null where email = '<a local test account>'"  # an admin with no plan (Review Focus 1)
DATABASE_URL=$L node scripts/db-migrate.mjs
docker exec musickit-db psql -U musickit -c "select email, role, permissions from users where permissions <> '{}'"
```

Expected: the migration applies; every former admin row shows `{dev,content,admin}` and role `student` or `teacher`
(student for the no-plan one); `select enum_range(null::user_role)` gives `{student,teacher,owner}`.
(If no admin row exists locally, add one first with `DATABASE_URL=$L node scripts/db-seed.mjs x@y.test:student` then
the `update` above.) Check the `db-seed.mjs` change: `DATABASE_URL=$L node scripts/db-seed.mjs z@y.test:admin`, then
the select shows it.

- [ ] **Step 7: Tests, types, docs**

Run: `npx tsx --test src/features/account/*.test.ts src/features/account/server/*.test.ts src/lib/db/*.test.ts`
Expected: PASS. `npx tsc --noEmit 2>&1 | grep -v '^.next/'`: the only errors left are `isAdmin` imports in
`access.ts` (Task 2). Update `src/features/account/README.md` (`model.ts` bullet). Run `npm run db:diagram` if it
works offline and include `docs/db/schema.*`; tell the user the DB schema artifact can be updated.

No commit here: `access.ts` still imports `isAdmin`, so Tasks 1 and 2 land as one commit at the end of Task 2.

---

### Task 2: Gates by permission

**Files:**
- Modify: `src/features/devtools/server/access.ts`, `access.test.ts`
- Modify: `src/app/dev/layout.tsx`, `src/app/admin/layout.tsx`
- Modify: every `src/app/api/dev/*` route calling `devOrAdminGate` (`commit`, `history`, `history/[id]`, `source`,
  `nam`) → `"dev"`; `src/app/api/admin/messages`, `src/app/api/admin/invites` → `"admin"`
- Modify: `src/features/devtools/model/apiRoutes.ts:14,43` and `apiRoutes.test.ts:40`
- Docs: `src/features/devtools/README.md` (lines 8-10, 70, 276), `src/features/admin/CLAUDE.md` (first bullet),
  `src/features/admin/README.md` (intro line: "a signed-in account with the admin permission")

**Interfaces:**
- Consumes: `hasPermission`, `Permission`, `Account` from Task 1.
- Produces (access.ts):
  - `permitted(p: Permission, account: () => Promise<Account | null>, dev: boolean = devOnly()): Promise<boolean>`
    (same body as `devOrAdmin`: dev → true without asking; a throw → logged, false)
  - `viewerAccount(): Promise<Account | null>` (today's private `pageAccount`, exported for Task 3)
  - `permissionPage(p: Permission): Promise<boolean>`
  - `permissionGate(req: Request, p: Permission): Promise<Response | null>` (keeps the `sameOrigin` rule for non-GET)
  - `devOrAdmin`, `devOrAdminPage`, `devOrAdminGate` are deleted.
- Produces (apiRoutes.ts): `guard: "signed in" | "dev only" | \`${Permission} permission\` | null`, read with
  `/\bpermissionGate\(\s*\w+\s*,\s*"(dev|content|admin)"/`.

- [ ] **Step 1: Write the failing tests**

`access.test.ts`: `acc(role, permissions)`; rewrite as

```ts
test("in production a page needs its own permission", async () => {
  assert.equal(await permitted("dev", async () => acc("student", ["dev"]), false), true);
  assert.equal(await permitted("admin", async () => acc("teacher", ["dev", "content"]), false), false);
  assert.equal(await permitted("content", async () => acc("owner", []), false), false);
  assert.equal(await permitted("dev", async () => null, false), false);
});
```

keep the development and failed-look-up tests on `permitted`. `apiRoutes.test.ts:40` becomes
`parseRoute("src/app/api/admin/x/route.ts", 'await permissionGate(req, "admin");').guard` → `"admin permission"`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx tsx --test src/features/devtools/server/access.test.ts src/features/devtools/model/apiRoutes.test.ts`
Expected: FAIL (`permitted` not exported; guard is null).

- [ ] **Step 3: Implement `access.ts` and `apiRoutes.ts`; move every caller**

`grep -rn "devOrAdmin\|isAdmin" src scripts` must come back empty afterwards (docs included). Layouts:
`if (!(await permissionPage("dev"))) notFound();` and `"admin"`; their comments say which permission.

- [ ] **Step 4: Run tests, types, lint**

Run: `npx tsx --test src/features/account/*.test.ts src/features/account/server/*.test.ts src/features/devtools/*/*.test.ts`
and `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files. Expected: PASS, no type errors.

- [ ] **Step 5: Check the gates on the dev server**

With the dev server on the local DB: `/dev` and `/admin` open with nobody signed in (development). Production gating
is covered by `permitted`'s tests; say so in the report.

- [ ] **Step 6: Commit Tasks 1 + 2** as `feat(account): permissions list (dev, content, admin) replaces the admin role`
  (temp index; only your hunks of `nam/route.ts` and `devtools/README.md`)

---

### Task 3: Permission ticks on the users page

**Files:**
- Create: `src/features/account/server/permissions.ts`, `permissions.test.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/features/admin/users/PermissionTicks.tsx` (client)
- Modify: `src/features/admin/users/UsersTable.tsx` (a Permissions column), `src/app/admin/users/page.tsx`
  (passes the viewer's id), `src/features/admin/registry.ts` (Users desc)
- Docs: `src/features/admin/README.md` (Users section; Routes line), `src/features/account/README.md` (server parts)

**Interfaces:**
- Consumes: `cleanPermissions`, `Permission`, `PERMISSIONS`, `PERMISSION_LABEL`, `AuthRepo.setPermissions` (Task 1);
  `permissionGate`, `viewerAccount` (Task 2); `auth`, `requestAccount`, `json`, `readJson` from
  `features/account/server/http`.
- Produces:
  - `changePermissions(deps: AuthDeps, actor: Account | null, userId: string, raw: unknown): Promise<{ ok: true; permissions: Permission[] } | { ok: false; error: "bad" | "self" | "missing" }>`
  - `PATCH /api/admin/users`, body `{ userId: string, permissions: string[] }` → 200 `{ permissions }`;
    400 `bad` (no `userId` string or `cleanPermissions` null); 409 `self`; 404 `missing`; gate `"admin"`.
  - `<PermissionTicks userId={string} initial={Permission[]} self={boolean} />`

- [ ] **Step 1: Write the failing tests** (`permissions.test.ts`, on `memoryRepo`)

```ts
test("an admin sets another person's permissions", ...)        // → ok, ["content"], row has ["content"]
test("an admin cannot remove their own admin", ...)            // actor.id === userId, ["dev"] → error "self", row unchanged
test("an admin may change their own other ticks", ...)         // own ["admin", "content"] → ok
test("nobody signed in (development) may change anyone", ...)  // actor null → ok
test("unknown permissions are refused", ...)                   // ["owner"], "dev", {} → "bad", nothing written
test("an unknown user is missing", ...)                        // → "missing"
```

`npm test` already globs `src/features/account/server/*.test.ts`, so nothing to add to `package.json`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx tsx --test src/features/account/server/permissions.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `changePermissions` and the route**

Order: clean (`bad`) → self rule (`actor?.id === userId && !permissions.includes("admin")` → `self`) →
`setPermissions` (null → `missing`). The route: `permissionGate(req, "admin")` first, then the actor via
`requestAccount(deps, req)` (null in development without login), `auth()` null → 503 "No database: set
DATABASE_URL." like the invites route. Who may call it is the gate's job, not `changePermissions`'.

- [ ] **Step 4: Run the tests**

Run: `npx tsx --test src/features/account/server/permissions.test.ts` — Expected: PASS.

- [ ] **Step 5: Load the copy skills, then build the ticks**

Load `design:ux-copy` and `teaching-voice` ("Words about the app"). `PermissionTicks`: three checkboxes labelled
`PERMISSION_LABEL`; on change, PATCH the new list with `AbortSignal.timeout(15_000)`; disabled while saving; on
failure put the ticks back to the last saved list and show the error under them; `self` disables unticking Admin
(with a short reason in a `title`). Starting copy, to check against the skills:
- column header `Permissions`
- `self` reason: `You can't remove your own admin permission.`
- error, `self` from the server: same line; any other failure: `Couldn't save. Try again.`

`UsersTable` gets a Permissions column after Role; `page.tsx` reads `viewerAccount()` and passes
`self={viewer?.id === u.id}`. Registry Users desc: `Every account, newest first, with its role and permissions.`

- [ ] **Step 6: Types, lint, all tests**

Run: `npm test 2>&1 | tail -5`, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files.
Expected: all pass, no errors.

- [ ] **Step 7: Read it in the browser**

Dev server on the local DB (pass the Docker `DATABASE_URL`; memory: in a worktree use `--webpack` and 127.0.0.1).
On `/admin/users`: tick Content for a student row, reload, it stays; untick, reload, gone. In DevTools block
`/api/admin/users` and tick: the tick goes back and the error shows (Review Focus 5). Signed in as the admin account
(local login), the own Admin tick can't be removed. Check the table at phone width doesn't overflow the page.

- [ ] **Step 8: Commit** `feat(admin): tick dev, content and admin per person on the users page` (temp index).
Then in `tasks.txt` mark ContentVideos1 done with the date, in the same commit.
