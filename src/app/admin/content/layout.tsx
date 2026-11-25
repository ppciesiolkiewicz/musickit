import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { permissionPage } from "@/features/devtools/server/access";

export const metadata: Metadata = { title: "Content · attunr", robots: { index: false } };

/**
 * The content half of /admin (the tools for writing and recording lessons, src/features/devtools): the content
 * permission, or development. Anyone else gets a 404. Each page sets its own frame (ContentShell).
 */
export default async function ContentLayout({ children }: { children: ReactNode }) {
  if (!(await permissionPage("content"))) notFound();
  return children;
}
