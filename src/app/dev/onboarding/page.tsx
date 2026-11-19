import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import CoverageView from "@/features/guide/CoverageView";

export const metadata: Metadata = { title: devTitle("/dev/onboarding") };

export default function OnboardingPage() {
  return <DevShell wide><CoverageView /></DevShell>;
}
