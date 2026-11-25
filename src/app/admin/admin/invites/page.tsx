import AdminShell from "@/features/admin/AdminShell";
import InvitesAdmin from "@/features/admin/invites/InvitesAdmin";

export const dynamic = "force-dynamic";

/** Teacher invites: make a link onto the Teacher Demo plan, and see who joined with each. */
export default function InvitesPage() {
  return (
    <AdminShell>
      <InvitesAdmin />
    </AdminShell>
  );
}
