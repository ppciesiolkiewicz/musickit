import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import ContentNav from "./ContentNav";
import { openPermissions } from "./server/access";

/** The /admin/content page frame: title, tabs, the tool. `wide` for tools that fill the screen. */
export default async function ContentShell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <PageShell active="/admin" wide={wide} title="Content" intro="Tools for writing and recording lessons.">
      <ContentNav open={await openPermissions()} />
      {children}
    </PageShell>
  );
}
