import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import AdminNav from "./AdminNav";

/** The /admin page frame: title, tabs, the page. */
export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PageShell active="/admin" wide title="Admin" intro="Running the app: what players send us. In development only for now.">
      <AdminNav />
      {children}
    </PageShell>
  );
}
