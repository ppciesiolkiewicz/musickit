import DevShell from "@/features/devtools/DevShell";
import { scanStructure } from "@/features/devtools/server/structure";
import StructureView from "@/features/devtools/structure/StructureView";

// Scanned on every load, so the map follows the code as you edit it.
export const dynamic = "force-dynamic";

export default function DevStructurePage() {
  return <DevShell wide><StructureView structure={scanStructure()} /></DevShell>;
}
