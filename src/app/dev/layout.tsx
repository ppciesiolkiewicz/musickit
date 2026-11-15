import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { devOnly } from "@/features/devtools/gate";

export const metadata: Metadata = { title: "Dev tools · attunr", robots: { index: false } };

/**
 * Tools for working on the app, in development only: a production build answers 404 for every /dev page, logged in or
 * not. In development they need no login (`/dev` is a public path). Each page sets its own frame (DevShell).
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (!devOnly()) notFound();
  return children;
}
