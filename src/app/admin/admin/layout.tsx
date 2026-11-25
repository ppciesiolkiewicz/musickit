import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { permissionPage } from "@/features/devtools/server/access";

/** The admin half of /admin (messages, users, invites): the admin permission, or development. Anyone else gets a 404. */
export default async function AdminAdminLayout({ children }: { children: ReactNode }) {
  if (!(await permissionPage("admin"))) notFound();
  return children;
}
