import DevShell from "@/features/devtools/DevShell";
import CompareModelsPage from "@/features/devtools/compare/CompareModelsPage";

/** Plans from several models for made-up players, priced as if through the API. */
export default function CompareModels() {
  return <DevShell wide><CompareModelsPage /></DevShell>;
}
