import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { permissionPage } from "@/features/devtools/server/access";

export const metadata: Metadata = { title: "Admin · attunr", robots: { index: false } };

/**
 * Pages for running the app (see src/features/admin). Open in development (no login needed: `/admin` is a public path)
 * and, in production, to a signed-in account with the admin permission; anyone else gets a 404.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await permissionPage("admin"))) notFound();
  return children;
}
