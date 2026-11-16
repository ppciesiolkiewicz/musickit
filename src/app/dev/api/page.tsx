import DevShell from "@/features/devtools/DevShell";
import ApiRoutesView from "@/features/devtools/api/ApiRoutesView";
import { scanApiRoutes } from "@/features/devtools/server/apiRoutes";

// Scanned on every load, so the list follows the route files as you edit them.
export const dynamic = "force-dynamic";

export default function DevApiPage() {
  return <DevShell wide><ApiRoutesView routes={scanApiRoutes()} root={process.cwd()} /></DevShell>;
}
