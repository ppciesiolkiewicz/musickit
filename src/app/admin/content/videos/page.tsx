import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import { contentTitle } from "@/features/devtools/registry";
import { listContentVideos } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { seedToolUse } from "@/features/contentVideos/server/seedCells";
import { videoTools } from "@/features/contentVideos/model/coverage";
import ToolVideos from "@/features/contentVideos/ui/ToolVideos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: contentTitle("/admin/content/videos") };

/** Every tool and level with its video or Missing, and the seed exercises that use it (src/features/contentVideos). */
export default async function VideosPage() {
  const store = contentVideos();
  let videos: Awaited<ReturnType<typeof listContentVideos>> = [];
  let error = "";
  if (!store) error = "This site has no database, so there are no videos to list.";
  else {
    try {
      videos = await listContentVideos(store.repo);
    } catch (e) {
      console.error("content-videos: list failed", e);
      error = "The videos could not be loaded.";
    }
  }
  return <ContentShell wide><ToolVideos tools={videoTools()} use={seedToolUse()} initial={videos} initialError={error} /></ContentShell>;
}
