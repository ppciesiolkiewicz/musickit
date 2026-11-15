import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { devOnly } from "@/features/devtools/gate";

/** Local-only tools; a production build answers 404. */
export default function LocalDevLayout({ children }: { children: ReactNode }) {
  if (!devOnly()) notFound();
  return children;
}
