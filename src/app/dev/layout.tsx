import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Dev tools · attunr", robots: { index: false } };

/**
 * Tools for working on the app. Each page sets its own frame (DevShell). `(local)` answers 404 in a production build;
 * `(live)` is on the live site for anyone logged in, linked from nowhere.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  return children;
}
