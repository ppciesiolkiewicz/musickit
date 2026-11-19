import AdminShell from "@/features/admin/AdminShell";
import { ROLE_LABEL } from "@/features/account/model";
import type { UserRow } from "@/features/account/server/repo";
import { auth } from "@/features/account/server/http";

export const dynamic = "force-dynamic";

const joined = (d: Date) => d.toISOString().slice(0, 10);

/** Every account, newest first, with its role. Read straight from the database; the layout lets only dev or an admin in. */
export default async function UsersPage() {
  const deps = auth();
  let users: UserRow[] | null = null;
  let error: string | null = deps ? null : "No database: set DATABASE_URL.";
  if (deps) {
    try {
      users = await deps.repo.listUsers();
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr className="border-b border-slate-700">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800">
                    <td className="py-2 pr-4 text-slate-100">{u.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{u.email}</td>
                    <td className="py-2 pr-4 text-slate-300">{ROLE_LABEL[u.role]}</td>
                    <td className="py-2 tabular-nums text-slate-400">{joined(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
