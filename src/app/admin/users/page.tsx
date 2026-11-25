import AdminShell from "@/features/admin/AdminShell";
import UsersTable, { type UserListRow } from "@/features/admin/users/UsersTable";
import { auth } from "@/features/account/server/http";
import { userData } from "@/features/userData/server/http";

export const dynamic = "force-dynamic";

/**
 * Every account, newest first, with its role, last log-in, plans and questionnaire answers. Read straight from the
 * database; the layout lets only dev or an admin in.
 */
export default async function UsersPage() {
  const deps = auth();
  const data = userData();
  let users: UserListRow[] | null = null;
  let error: string | null = deps && data ? null : "No database: set DATABASE_URL.";
  if (deps && data) {
    try {
      const [list, sessionTimes, plans] = await Promise.all([deps.repo.listUsers(), deps.repo.listSessionTimes(), data.repo.listPlanSummaries()]);
      const timesBy = new Map(sessionTimes.map((t) => [t.userId, t]));
      const planBy = new Map(plans.map((p) => [p.userId, p]));
      users = list.map((user) => ({ user, times: timesBy.get(user.id) ?? null, plan: planBy.get(user.id) ?? null }));
    } catch (e) {
      console.error("[admin/users] could not list users", e);
      error = "Couldn't load the users. Reload the page to try again.";
    }
  }
  return (
    <AdminShell>
      {error && <p className="text-sm text-amber-200">{error}</p>}
      {users && (
        <>
          <p className="mb-3 text-sm text-slate-400">{users.length === 1 ? "1 account" : `${users.length} accounts`}</p>
          <UsersTable rows={users} />
        </>
      )}
    </AdminShell>
  );
}
