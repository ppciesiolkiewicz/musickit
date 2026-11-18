import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { devOnly } from "@/features/devtools/gate";

export const metadata: Metadata = { title: "Admin · attunr", robots: { index: false } };

/**
 * Pages for running the app (see src/features/admin). In development only for now: a production build answers 404
 * for every /admin page, logged in or not, and in development they need no login (`/admin` is a public path).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!devOnly()) notFound();
  return children;
}
