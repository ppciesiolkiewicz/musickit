import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import DevNav from "./DevNav";
import { devOnly } from "./gate";

/** The /dev page frame: title, tabs, the tool. `wide` for tools that fill the screen; the examples keep the plan page's frame so its cards read as on /plan. */
export default function DevShell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <PageShell active="/dev" wide={wide} title="Dev tools" intro={devOnly() ? "Tools for working on the app. Most are local only." : "Tools for working on the app. Only people who are logged in can open them."}>
      <DevNav />
      {children}
    </PageShell>
  );
}
