import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { devOnly } from "@/features/devtools/gate";

export const metadata: Metadata = { title: "Dev tools · attunr", robots: { index: false } };

/** Local-only tools; a production build answers 404. */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (!devOnly()) notFound();
  return (
    <PageShell active="/dev" wide title="Dev tools" intro="Local tools for working on the app. Not in production.">
      {children}
    </PageShell>
  );
}
