import DevShell from "@/features/devtools/DevShell";
import ComponentStories from "@/features/devtools/stories/ComponentStories";

export default function StoriesPage() {
  return <DevShell wide><ComponentStories /></DevShell>;
}
