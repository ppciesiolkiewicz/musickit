import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { openPermissions } from "@/features/devtools/server/access";
import AdminNav from "./AdminNav";

/** The /admin page frame: title, tabs, the page. */
export default async function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PageShell active="/admin" wide title="Admin" intro="Running the app: who has an account and what they send us.">
      <AdminNav open={await openPermissions()} />
      {children}
    </PageShell>
  );
}
