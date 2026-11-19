import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import AdminNav from "./AdminNav";

/** The /admin page frame: title, tabs, the page. */
export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PageShell active="/admin" wide title="Admin" intro="Running the app: who has an account and what they send us.">
      <AdminNav />
      {children}
    </PageShell>
  );
}
