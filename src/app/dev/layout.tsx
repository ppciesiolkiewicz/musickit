import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { devOrAdminPage } from "@/features/devtools/server/access";

export const metadata: Metadata = { title: "Dev tools · attunr", robots: { index: false } };

/**
 * Tools for working on the app. Open in development (no login needed: `/dev` is a public path) and, in production, to a
 * signed-in admin; anyone else gets a 404. Each page sets its own frame (DevShell).
 */
export default async function DevLayout({ children }: { children: ReactNode }) {
  if (!(await devOrAdminPage())) notFound();
  return children;
}
