"use client";

import type { ReactNode } from "react";
import { OverlayDrawProvider } from "@/features/contentVideos/ui/OverlayVideo";
import { drawToolOverlay } from "@/features/plan/ui/ToolOverlay";

/** Lets the videos played on this page draw their tool over them (the plan's `ToolOverlay`). */
export default function DrawTools({ children }: { children: ReactNode }) {
  return <OverlayDrawProvider draw={drawToolOverlay}>{children}</OverlayDrawProvider>;
}
