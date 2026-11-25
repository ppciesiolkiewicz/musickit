import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import { StudioApp } from "@/features/teachers/studio";

export const metadata: Metadata = { title: contentTitle("/admin/content/studio") };

/** The video studio keeps the whole window for its frame, so it has no ContentShell around it. */
export default function StudioPage() {
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <StudioApp />
    </div>
  );
}
