import AdminShell from "@/features/admin/AdminShell";
import UsersTable, { type UserListRow } from "@/features/admin/users/UsersTable";
import { hasPermission } from "@/features/account/model";
import { auth } from "@/features/account/server/http";
import { viewerAccount } from "@/features/devtools/server/access";
import { userData } from "@/features/userData/server/http";
import { reminderRepo } from "@/features/reminders/server/deps";

export const dynamic = "force-dynamic";

/**
 * Every account, newest first, with its role, permissions (ticked in place), consents, daily reminder, last log-in, plans and questionnaire answers. Read straight from the
 * database; the layout lets only an admin in (anyone in development).
 */
export default async function UsersPage() {
  const deps = auth();
  const data = userData();
  const reminders = reminderRepo();
  let users: UserListRow[] | null = null;
  let viewerId: string | null = null;
  let error: string | null = deps && data ? null : "No database: set DATABASE_URL.";
  if (deps && data) {
    try {
      const [list, sessionTimes, plans, reminderList, viewer] = await Promise.all([
        deps.repo.listUsers(),
        deps.repo.listSessionTimes(),
        data.repo.listPlanSummaries(),
        reminders ? reminders.listAll() : [],
        viewerAccount().catch(() => null),
      ]);
      viewerId = hasPermission(viewer, "admin") ? viewer!.id : null;
      const timesBy = new Map(sessionTimes.map((t) => [t.userId, t]));
      const planBy = new Map(plans.map((p) => [p.userId, p]));
      const reminderBy = new Map(reminderList.map((r) => [r.userId, r]));
      users = list.map((user) => ({ user, times: timesBy.get(user.id) ?? null, plan: planBy.get(user.id) ?? null, reminder: reminderBy.get(user.id) ?? null }));
    } catch (e) {
      console.error("[admin/admin/users] could not list users", e);
      error = "Couldn't load the users. Reload the page to try again.";
    }
  }
  return (
    <AdminShell>
      {error && <p className="text-sm text-amber-200">{error}</p>}
      {users && (
        <>
          <p className="mb-3 text-sm text-slate-400">{users.length === 1 ? "1 account" : `${users.length} accounts`}</p>
          <UsersTable rows={users} viewerId={viewerId} />
        </>
      )}
    </AdminShell>
  );
}
