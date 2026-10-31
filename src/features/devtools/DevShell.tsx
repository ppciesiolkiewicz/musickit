import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import DevNav from "./DevNav";

/** The /dev page frame: title, tabs, the tool. `wide` for tools that fill the screen; the examples keep the plan page's frame so its cards read as on /plan. */
export default function DevShell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <PageShell active="/dev" wide={wide} title="Dev tools" intro="Local tools for working on the app. Not in production.">
      <DevNav />
      {children}
    </PageShell>
  );
}
