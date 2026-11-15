import DevShell from "@/features/devtools/DevShell";
import { pathNodes } from "@/features/devtools/model/path";
import PathView from "@/features/devtools/path/PathView";

// Built on the server so the course (large) stays out of the browser; the view gets plain nodes.
export default function DevPathPage() {
  return <DevShell wide><PathView nodes={[...pathNodes().values()]} /></DevShell>;
}
