import DevShell from "@/features/devtools/DevShell";
import CoverageView from "@/features/guide/CoverageView";

export default function OnboardingPage() {
  return <DevShell wide><CoverageView /></DevShell>;
}
